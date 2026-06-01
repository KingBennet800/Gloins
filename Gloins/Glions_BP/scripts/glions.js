// Glions - Economy & Trading core script
// Designed for Bedrock's scripting API (enable experimental gameplay & scripting)
(function () {
  const system = server.registerSystem(0, 0);
  const PRICES = require('../config/prices.json');
  const SETTINGS = require('../config/settings.json');

  system.initialize = function () {
    this.pendingTrades = {}; // tradeId -> {a, b, aItems, bItems, aConfirmed, bConfirmed}
    this.transactionLog = [];
    this.createScoreboard();
    this.registerCommands();
    this.listenForPlayerJoin();
    this.pendingByPlayer = {}; // map player->tradeId for quick lookup
  };

  system.createScoreboard = function () {
    this.executeCommand('scoreboard objectives add glions dummy Glions', () => {});
    this.executeCommand('scoreboard objectives add glions_init dummy GlionsInitialized', () => {});
  };

  system.registerCommands = function () {
    // provide a lightweight registerCommand shim that uses server.registerCommand when available
    this.registerCommand = (name, desc, perm, handler) => {
      try {
        server.registerCommand(name, desc, perm, (cmd) => { handler(cmd); });
      } catch (e) {
        if (!this.commands) this.commands = {};
        this.commands[name] = handler;
      }
    };

    this.registerCommand('glions', 'Open Glions main menu', 0, (cmd) => {
      const player = cmd.sender;
      this.openMainMenu(player);
    });

    this.registerCommand('glions.trade', 'Trade actions: invite/accept/view/cancel <player>', 1, (cmd) => {
      const action = cmd.args && cmd.args[0];
      const sender = cmd.sender;
      const senderName = (sender && sender.name) ? sender.name : sender;
      if (!action) {
        this.executeCommand(`tellraw ${senderName} {"rawtext":[{"text":"Usage: /glions.trade invite <player> | /glions.trade accept <player> | /glions.trade view | /glions.trade cancel"}]}`);
        return;
      }
      if (action === 'invite') {
        const to = cmd.args[1];
        this.createTradeInvite(sender, senderName, to);
      } else if (action === 'accept') {
        const inviter = cmd.args[1];
        this.acceptTradeInvite(sender, inviter);
      } else if (action === 'view') {
        this.openPendingTradeUI(sender);
      } else if (action === 'cancel') {
        this.cancelPendingTrade(sender);
      } else {
        this.executeCommand(`tellraw ${senderName} {"rawtext":[{"text":"Unknown trade action. Use invite, accept, view, or cancel."}]}`);
      }
    });

    this.registerCommand('glions.admin', 'Admin: open Glions admin menu', 2, (cmd) => {
      const sender = cmd.sender;
      this.openAdminMenu(sender);
    });
    // export logs quick command
    this.registerCommand('glions.exportlogs', 'Export recent Glions logs to you (admin)', 2, (cmd) => {
      const sender = cmd.sender;
      this.exportLogs(sender);
    });
  };

  system.listenForPlayerJoin = function () {
    this.listenForEvent('minecraft:entity_created', (ev) => {
      try {
        const ent = ev.data.entity;
        if (!ent) return;
        const components = ent.__identifier__ || '';
        if (components.toString().toLowerCase().includes('player')) {
          const name = ent.name || (ent.__unique_id__ || '').toString();
          if (name) this.ensurePlayerBalance(ent, name);
        }
      } catch (e) {}
    });
    this.listenForEvent('minecraft:tick', () => {
      this.expireStaleTrades();
    });
  };

  /* Balance helpers: using scoreboard for persistent storage */
  system.addBalance = function (playerName, amount) {
    this.executeCommand(`scoreboard players add "${playerName}" glions ${Math.floor(amount)}`, () => {});
  };
  system.setBalance = function (playerName, amount) {
    this.executeCommand(`scoreboard players set "${playerName}" glions ${Math.floor(amount)}`, () => {});
  };
  system.getBalance = function (playerName, cb) {
    // best-effort: request scoreboard list and parse
    this.executeCommand(`scoreboard players list "${playerName}"`, (res) => {
      const output = res.statusMessage || '';
      const m = output.match(/has ([-0-9]+) in objective glions/);
      if (m) cb(Number(m[1])); else cb(0);
    });
  };

  system.openCustomUI = function (player, uiId, data) {
    // Placeholder for Bedrock versions with custom UI support.
    // For builds that support custom UI screens, wire this function to
    // a custom UI API and use the data payload to render panels and icons.
    return false;
  };

  system.getInitialized = function (playerName, cb) {
    this.executeCommand(`scoreboard players list "${playerName}"`, (res) => {
      const output = res.statusMessage || '';
      const m = output.match(/has ([-0-9]+) in objective glions_init/);
      if (m) cb(Number(m[1])); else cb(0);
    });
  };

  system.setInitialized = function (playerName) {
    this.executeCommand(`scoreboard players set "${playerName}" glions_init 1`, () => {});
  };

  system.ensurePlayerBalance = function (player, playerName) {
    this.getInitialized(playerName, (initialized) => {
      if (!initialized && SETTINGS.starting_balance && SETTINGS.starting_balance > 0) {
        this.setBalance(playerName, SETTINGS.starting_balance);
        this.setInitialized(playerName);
        this.logTransaction('init_balance', playerName, SETTINGS.starting_balance, {note: 'initial'});
        if (player) {
          this.executeCommand(`tellraw ${playerName} {"rawtext":[{"text":"Welcome! You have received ${SETTINGS.starting_balance} ${SETTINGS.currency_symbol} as starting balance."}]}`);
        }
      }
    });
  };

  /* Main menu UI */
  system.openMainMenu = function (player) {
    const form = new ModalFormData();
    form.title('Glions - Main Menu');
    form.button('Balance');
    form.button('Sell Items');
    form.button('Buy Items');
    form.button('Trade With Player');
    form.button('History');
    form.button('Settings');
    form.show(player).then((res) => {
      if (res.selection === 0) this.showBalance(player);
      if (res.selection === 1) this.openSellMenu(player);
      if (res.selection === 2) this.openBuyCategories(player);
      if (res.selection === 3) this.openTradeInviteForm(player);
      if (res.selection === 4) this.openHistory(player);
      if (res.selection === 5) this.openSettings(player);
    }).catch(() => {});
  };

  system.showBalance = function (player) {
    const name = player.name || player.getName();
    this.getBalance(name, (bal) => {
      const form = new ModalFormData();
      form.title('Your Balance');
      form.label(`${bal} ${SETTINGS.currency_symbol}`);
      form.button('Back');
      form.show(player).then(() => { this.openMainMenu(player); }).catch(() => {});
    });
  };

  /* Sell Items UI - simple: ask for item id and qty to sell */
  system.openSellMenu = function (player) {
    const form = new ModalFormData();
    form.title('Sell Items');
    form.input('Item ID (eg minecraft:diamond)', 'minecraft:');
    form.input('Quantity', '1');
    form.show(player).then((res) => {
      if (!res || !res.formValues) { this.openMainMenu(player); return; }
      const itemId = (res.formValues[0] || '').trim();
      const qty = Math.max(1, Math.floor(Number(res.formValues[1] || 0)));
      if (!itemId || qty <= 0) {
        this.executeCommand(`tellraw ${player.name} {"rawtext":[{"text":"Invalid sell input."}]}`);
        this.openMainMenu(player);
        return;
      }
      const pricePer = PRICES.sell_prices[itemId] || 0;
      const total = Math.floor(pricePer * qty);
      if (total <= 0) {
        this.executeCommand(`tellraw ${player.name} {"rawtext":[{"text":"Cannot sell ${itemId} — not in price list."}]}`);
        this.openMainMenu(player);
        return;
      }
      this.executeCommand(`clear ${player.name} ${itemId} ${qty}`, (res) => {
        this.addBalance(player.name, total);
        this.logTransaction('sell', player.name, total, {item: itemId, qty});
        this.executeCommand(`tellraw ${player.name} {"rawtext":[{"text":"Sold ${qty}x ${itemId} for ${total} ${SETTINGS.currency_symbol}."}]}`);
      });
    }).catch(() => { this.openMainMenu(player); });
  };

  /* Buy GUI - categories -> items */
  system.openBuyCategories = function (player) {
    const cats = Object.keys(PRICES.shop_categories || {});
    const form = new ModalFormData();
    form.title('Buy - Categories');
    cats.forEach((c) => form.button(c));
    form.show(player).then((res) => {
      if (!res || res.selection === undefined) { this.openMainMenu(player); return; }
      const sel = cats[res.selection];
      if (sel) this.openBuyCategoryItems(player, sel);
    }).catch(() => { this.openMainMenu(player); });
  };

  system.openBuyCategoryItems = function (player, category) {
    const items = PRICES.shop_categories[category] || [];
    const form = new ModalFormData();
    form.title(`Buy - ${category}`);
    items.forEach((it) => {
      const price = PRICES.buy_prices[it] || 0;
      form.button(`${it} - ${price} ${SETTINGS.currency_symbol}`);
    });
    form.show(player).then((res) => {
      if (!res || res.selection === undefined) { this.openMainMenu(player); return; }
      const it = items[res.selection];
      const price = PRICES.buy_prices[it] || 0;
      const qtyForm = new ModalFormData();
      qtyForm.title(`Buy ${it}`);
      qtyForm.input('Quantity', '1');
      qtyForm.show(player).then((r2) => {
        if (!r2 || !r2.formValues) { this.openMainMenu(player); return; }
        const qty = Math.max(1, Math.floor(Number(r2.formValues[0] || 1)));
        const total = Math.floor(price * qty);
        this.getBalance(player.name, (bal) => {
          if (!SETTINGS.allow_negative_balances && bal < total) {
            this.executeCommand(`tellraw ${player.name} {"rawtext":[{"text":"Insufficient ${SETTINGS.currency_name}."}]}`);
            return;
          }
          this.addBalance(player.name, -total);
          this.executeCommand(`give ${player.name} ${it} ${qty}`, () => {
            this.logTransaction('buy', player.name, -total, {item: it, qty});
            this.executeCommand(`tellraw ${player.name} {"rawtext":[{"text":"Purchased ${qty}x ${it} for ${total} ${SETTINGS.currency_symbol}."}]}`);
          });
        });
      });
    }).catch(() => { this.openMainMenu(player); });
  };

  /* Simple history viewer (recent in-memory transactions) */
  system.openHistory = function (player) {
    const form = new ModalFormData();
    form.title('Transaction History (recent)');
    const lines = this.transactionLog.slice(-20).map((t) => `${t.time} - ${t.type} - ${t.player} - ${t.amount}`);
    if (lines.length === 0) lines.push('No recent transactions.');
    lines.forEach((l) => form.label(l));
    form.button('Back');
    form.show(player).then(() => { this.openMainMenu(player); });
  };

  system.openSettings = function (player) {
    const form = new ModalFormData();
    form.title('Settings');
    form.label(`Currency: ${SETTINGS.currency_name} (${SETTINGS.currency_symbol})`);
    form.label(`Starting balance: ${SETTINGS.starting_balance}`);
    form.button('Back');
    form.show(player).then(() => { this.openMainMenu(player); });
  };

  /* Trade invitations and secure trading */
  system.openTradeInviteForm = function (player) {
    const form = new ModalFormData();
    form.title('Invite to Trade');
    form.input('Target player name', 'playerName');
    form.show(player).then((res) => {
      if (!res || !res.formValues || !res.formValues[0]) { this.openMainMenu(player); return; }
      const target = res.formValues[0].trim();
      const from = player.name || player;
      this.createTradeInvite(player, from, target);
    }).catch(() => { this.openMainMenu(player); });
  };

  system.createTradeInvite = function (playerEntity, from, to) {
    if (!to || from === to) { this.executeCommand(`tellraw ${from} {"rawtext":[{"text":"Invalid target for trade."}]}`); return; }
    if (this.pendingByPlayer[from] || this.pendingByPlayer[to]) {
      this.executeCommand(`tellraw ${from} {"rawtext":[{"text":"Either you or ${to} already has a pending trade."}]}`);
      return;
    }
    const id = `${from}->${to}:${Date.now()}`;
    this.pendingTrades[id] = {
      a: from,
      b: to,
      aItems: [],
      bItems: [],
      aConfirmed: false,
      bConfirmed: false,
      created: Date.now(),
      state: 'pending'
    };
    this.pendingByPlayer[from] = id;
    this.pendingByPlayer[to] = id;
    this.executeCommand(`tellraw ${to} {"rawtext":[{"text":"${from} has invited you to trade. Use /glions.trade accept ${from} to accept or /glions.trade cancel to decline."}]}`);
    this.executeCommand(`tellraw ${from} {"rawtext":[{"text":"Trade invite sent to ${to}."}]}`);
  };

  system.acceptTradeInvite = function (playerEntity, inviter) {
    const accepterName = (playerEntity && playerEntity.name) ? playerEntity.name : playerEntity;
    const id = Object.keys(this.pendingTrades).find(k => this.pendingTrades[k].a === inviter && this.pendingTrades[k].b === accepterName);
    if (!id) {
      this.executeCommand(`tellraw ${accepterName} {"rawtext":[{"text":"No trade invite found from ${inviter}."}]}`);
      return;
    }
    this.executeCommand(`tellraw ${inviter} {"rawtext":[{"text":"${accepterName} accepted your trade. Use /glions.trade view to open the trade panel."}]}`);
    this.openTradeUI(playerEntity, id);
  };

  system.openPendingTradeUI = function (playerEntity) {
    const playerName = playerEntity.name || playerEntity;
    const mapping = this.pendingByPlayer[playerName];
    if (!mapping) {
      this.executeCommand(`tellraw ${playerName} {"rawtext":[{"text":"You have no pending trade."}]}`);
      return;
    }
    this.openTradeUI(playerEntity, mapping);
  };

  system.cancelPendingTrade = function (playerEntity) {
    const playerName = playerEntity.name || playerEntity;
    const mapping = this.pendingByPlayer[playerName];
    if (!mapping) {
      this.executeCommand(`tellraw ${playerName} {"rawtext":[{"text":"You have no pending trade to cancel."}]}`);
      return;
    }
    this.cancelTrade(mapping, `${playerName} canceled the trade.`);
  };

  system.openTradeUI = function (playerEntity, tradeId) {
    const playerName = playerEntity.name || playerEntity;
    const t = this.pendingTrades[tradeId];
    if (!t) { this.executeCommand(`tellraw ${playerName} {"rawtext":[{"text":"Trade not found."}]}`); return; }
    const isA = (playerName === t.a);
    const myItems = isA ? t.aItems : t.bItems;
    const otherItems = isA ? t.bItems : t.aItems;
    const form = new ModalFormData();
    form.title(`Trade: ${t.a} ⇄ ${t.b}`);
    form.label(`Your items:`);
    if (myItems.length === 0) form.label('(none)'); else myItems.forEach(it => form.label(`${it.qty}x ${it.item}`));
    form.label(`Other's items:`);
    if (otherItems.length === 0) form.label('(none)'); else otherItems.forEach(it => form.label(`${it.qty}x ${it.item}`));
    const status = [];
    if ((isA && t.aConfirmed) || (!isA && t.bConfirmed)) status.push('You confirmed');
    if ((isA && t.bConfirmed) || (!isA && t.aConfirmed)) status.push('Other confirmed');
    form.label(`Status: ${status.length ? status.join(' & ') : 'Awaiting confirmation'}`);
    form.button('Add Item');
    form.button('Confirm Trade');
    form.button('Cancel Trade');
    form.show(playerEntity).then((res) => {
      if (res.selection === 0) {
        const addForm = new ModalFormData();
        addForm.title('Add Item to Trade');
        addForm.input('Item ID', 'minecraft:');
        addForm.input('Quantity', '1');
        addForm.show(playerEntity).then((r2) => {
          const itemId = r2.formValues[0];
          const qty = Math.max(1, Math.floor(Number(r2.formValues[1] || 1)));
          if (this.addTradeItem(tradeId, playerName, itemId, qty)) {
            this.openTradeUI(playerEntity, tradeId);
          } else {
            this.openTradeUI(playerEntity, tradeId);
          }
        }).catch(() => { this.openTradeUI(playerEntity, tradeId); });
      } else if (res.selection === 1) {
        this.confirmTrade(tradeId, playerName);
      } else if (res.selection === 2) {
        this.cancelTrade(tradeId, `${playerName} canceled the trade.`);
      }
    }).catch(() => {});
  };

  // Add or remove items from an escrow (simple text-based API expected)
  system.addTradeItem = function (tradeId, playerName, itemId, qty) {
    const t = this.pendingTrades[tradeId];
    if (!t) return false;
    if (!itemId || qty <= 0) {
      this.executeCommand(`tellraw ${playerName} {"rawtext":[{"text":"Invalid item or quantity."}]}`);
      return false;
    }
    const ownerKey = (playerName === t.a) ? 'aItems' : 'bItems';
    this.executeCommand(`clear ${playerName} ${itemId} ${qty}`, (res) => {
      t[ownerKey].push({item: itemId, qty});
      this.executeCommand(`tellraw ${playerName} {"rawtext":[{"text":"Added ${qty}x ${itemId} to trade escrow."}]}`);
      t.aConfirmed = false; t.bConfirmed = false;
    });
    return true;
  };

  system.confirmTrade = function (tradeId, playerName) {
    const t = this.pendingTrades[tradeId];
    if (!t) return;
    if (playerName === t.a) t.aConfirmed = true;
    if (playerName === t.b) t.bConfirmed = true;
    if (t.aConfirmed && t.bConfirmed) {
      // exchange escrow items
      t.aItems.forEach((it) => { this.executeCommand(`give ${t.b} ${it.item} ${it.qty}`); });
      t.bItems.forEach((it) => { this.executeCommand(`give ${t.a} ${it.item} ${it.qty}`); });
      this.logTransaction('trade', `${t.a}<->${t.b}`, 0, {aItems: t.aItems, bItems: t.bItems});
      // cleanup mappings
      delete this.pendingByPlayer[t.a]; delete this.pendingByPlayer[t.b];
      delete this.pendingTrades[tradeId];
      this.executeCommand(`tellraw @a {"rawtext":[{"text":"Trade between ${t.a} and ${t.b} completed."}]}`);
    } else {
      this.executeCommand(`tellraw ${playerName} {"rawtext":[{"text":"You have confirmed. Waiting for other player."}]}`);
    }
  };

  system.cancelTrade = function (tradeId, reason) {
    const t = this.pendingTrades[tradeId];
    if (!t) return;
    // return escrow items
    t.aItems.forEach((it) => { this.executeCommand(`give ${t.a} ${it.item} ${it.qty}`); });
    t.bItems.forEach((it) => { this.executeCommand(`give ${t.b} ${it.item} ${it.qty}`); });
    delete this.pendingByPlayer[t.a]; delete this.pendingByPlayer[t.b];
    delete this.pendingTrades[tradeId];
    this.executeCommand(`tellraw @a {"rawtext":[{"text":"${reason || `Trade ${tradeId} canceled and items returned.`}"}]}`);
  };

  system.expireStaleTrades = function () {
    const cutoff = Date.now() - ((SETTINGS.max_trade_time_seconds || 300) * 1000);
    Object.keys(this.pendingTrades).forEach((tradeId) => {
      const t = this.pendingTrades[tradeId];
      if (!t || t.created > cutoff) return;
      this.cancelTrade(tradeId, `Trade between ${t.a} and ${t.b} expired due to inactivity.`);
    });
  };

  /* Transaction logging (in-memory + console); administrators can persist externally */
  // Admin GUI and log export
  system.openAdminMenu = function (sender) {
    const form = new ModalFormData();
    form.title('Glions - Admin');
    form.button('Add Balance');
    form.button('Set Balance');
    form.button('Remove Balance');
    form.button('Check Balance');
    form.button('Export Logs (recent)');
    form.show(sender).then((res) => {
      const sel = res.selection;
      if (sel === 0) this.adminAdjust(sender, 'add');
      if (sel === 1) this.adminAdjust(sender, 'set');
      if (sel === 2) this.adminAdjust(sender, 'remove');
      if (sel === 3) this.adminAdjust(sender, 'check');
      if (sel === 4) this.exportLogs(sender);
    }).catch(() => {});
  };

  system.adminAdjust = function (sender, mode) {
    const f = new ModalFormData();
    f.title(`Admin - ${mode}`);
    f.input('Target player name', 'player');
    f.input('Amount', '0');
    f.show(sender).then((res) => {
      const target = res.formValues[0];
      const amount = Math.floor(Number(res.formValues[1] || 0));
      if (mode === 'add') { this.addBalance(target, amount); this.logTransaction('admin_add', target, amount); }
      if (mode === 'set') { this.setBalance(target, amount); this.logTransaction('admin_set', target, amount); }
      if (mode === 'remove') { this.addBalance(target, -amount); this.logTransaction('admin_remove', target, amount); }
      if (mode === 'check') { this.getBalance(target, (bal) => { this.executeCommand(`tellraw ${sender} {"rawtext":[{"text":"${target} balance: ${bal} ${SETTINGS.currency_symbol}"}]}`); }); }
    }).catch(() => {});
  };

  system.exportLogs = function (sender) {
    const lines = this.transactionLog.slice(-50).map(t => `${t.time} ${t.type} ${t.player} ${t.amount}`);
    if (lines.length === 0) {
      this.executeCommand(`tellraw ${sender} {"rawtext":[{"text":"No logs to export."}]}`);
      return;
    }
    lines.forEach((l) => { this.executeCommand(`tellraw ${sender} {"rawtext":[{"text":"${l}"}]}`); });
  };

  system.logTransaction = function (type, player, amount, meta) {
    const entry = { time: new Date().toISOString(), type, player, amount, meta };
    this.transactionLog.push(entry);
    // echo to console for server operators
    try { server.log && server.log(`[Glions] ${entry.time} ${type} ${player} ${amount}`); } catch (e) {}
  };

  /* Generic wrapper for executing commands */
  system.executeCommand = function (command, cb) {
    system.executeCommandRaw(command, cb);
  };

  // compatibility shim (some runtimes expose executeCommand differently)
  system.executeCommandRaw = function (command, cb) {
    try {
      server.executeCommand(command, (res) => { if (cb) cb(res); });
    } catch (e) {
      if (this !== system && typeof this.executeCommand === 'function') {
        try { this.executeCommand(command, cb); return; } catch (e2) {}
      }
      if (cb) cb({ statusMessage: '' });
    }
  };
})();
