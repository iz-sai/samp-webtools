Element.addMethods({
  getDataset: function(element) {
    if (element.dataset) return element.dataset;
    var match, dataset = {};
    $A(element.attributes).each(function(attr){
      if (attr.nodeName.startsWith('data-'))
        dataset[attr.nodeName.substring(5)] = attr.nodeValue;
    });
    return element.dataset = dataset;
  }
});

SampWT = (function(){
  var container;
  var someRowsAreSelected = false;
  var highlightedRow;
  
  var wscIsConnected = false;
  var connectionTimeout;
  var waitingForHubInterval;
  
  // this is used to work around topcat bug of resending received messages
  // if browser is foreground, received messages will be ignored
  // not ignoring by default
  var browserIsForeground = false;
  
  var clients = [];
  
  // Safari freezes if java calls js and js call java right away, that's why deferring handlers
  WebSampConnector.onlineHandler = function(status) { onlineHandler.defer(status) };
  WebSampConnector.hubEventsHandler = function(event, data) { hubEventsHandler.defer(event, data) };
  WebSampConnector.highlightRowHandler = highlightRowHandler;
  WebSampConnector.selectRowListHandler = selectRowListHandler;
  
  function init() {
    if (SampWT.started) return;
    
    createDOM();
    assignHandlers();

    if (cookie.sampwtOn()) connect();
    
    SampWT.started = true;
  }
  
  function createDOM() {
    if (SampWT.tableId) {
      table.node = $(SampWT.tableId);
      table.data = table.node.getDataset();
    }
    
    container = new Element('div', {id: 'sampwt-container', className: 'sampwt-disconnected'});
    
    container.innerHTML =
      '<div id="sampwt-status">' +
        '<span id="sampwt-disconnected">VO mode: off<br><button onclick="SampWT.connect()">(turn on)</button></span>' +
        '<span id="sampwt-connecting"  >VO connecting…<br><button onclick="SampWT.disconnect()">(stop)</button></span>' +
        '<span id="sampwt-connected"   >VO mode: on <br><button onclick="SampWT.disconnect()">(turn off)</button></span>' +
      '</div>' +
      '<p><button style="display:none;" id="sampwt-broadcast" onclick="SampWT.table.upload()">Re-broadcast table</button></p>' +
      '<dl id="sampwt-clients">' +
        '<dt><img>Aladin</dt>: <dd data-name="Aladin" class="sampwt-off"><span class="stopped">stopped<br><a href="http://aladin.u-strasbg.fr/java/nph-aladin.pl?frame=get&id=aladin.jnlp">(start)</a></span><span class="started">started</span></dd>' +
        '<dt><img>Topcat</dt>: <dd data-name="topcat" class="sampwt-off"><span class="stopped">stopped<br><a href="http://andromeda.star.bris.ac.uk/~mbt/topcat/topcat-full.jnlp"         >(start)</a></span><span class="started">started</span></dd>' +
      '</dl>' +
      '<dl id="sampwt-unknown-clients"></dl>' +
      (SampWT.helpUrl ? '<div id="sampwt-help"><a href="' + SampWT.helpUrl + '" target="_blank">Help</a></div>' : '');
    document.body.appendChild(container);

    clients.knownNode = container.down('dl');
    clients.unknownNode = clients.knownNode.next();
  }
  
  function assignHandlers() {
    makeLinksBroadcastable();
    
    Event.observe(window, 'focus', function(){ browserIsForeground = true; });
    Event.observe(window, 'blur',  function(){ browserIsForeground = false; });

    if (!SampWT.tableId) return;
  
    table.node.observe('mouseover', table.hoverHandler.bind(table));
    table.node.observe('click',     table.clickHandler.bind(table));
    table.makeSortable();
  }
  
  function connect() {
    container.className = 'sampwt-connecting';
    
    cookie.set();
    WebSampConnector.start();
    
    connectionTimeout = setTimeout(onConnectionFail, 10000);
    
    setTimeout(function(){
      if ($('wsc-no-java').clientHeight == 0) return;
      disconnect();
    }, 100);
  }
  
  function disconnect() {
    clearTimeout(connectionTimeout);
    clearTimeout(waitingForHubInterval);

    container.className = 'sampwt-disconnected';
    cookie.unset();
    
    container.select('dd').each(function(dd){ dd.className = 'sampwt-off' });
    container.down('#sampwt-broadcast').style.display = 'none';

    if (highlightedRow) highlightedRow.removeClassName('sampwt-highlighted');
    if (someRowsAreSelected) {
      table.node.select('input[type=checkbox]:checked').each(function(checkbox){
        checkbox.checked = false;
        // up.up is faster than up('tr')
        checkbox.up().up().removeClassName('sampwt-selected');
      })
    }
    
    if (!wscIsConnected) return;
    try {
      WebSampConnector.disconnect();
    } catch(e) {}
    wscIsConnected = false;
  }

  function onlineHandler(status) {
    if (status == 'disconnected') {
      container.className = 'sampwt-connecting';
      wscIsConnected = false;

      onConnectionFail();
      return;
    }
    
    clearTimeout(connectionTimeout);
    clearInterval(waitingForHubInterval);
    waitingForHubInterval = undefined;

    container.className = 'sampwt-connected';
    
    wscIsConnected = true;
    
    // safari can't understand java object translated to js, fails here
    try {
      clients.updateList();
    } catch(e) {;}
    
    if (!SampWT.tableId) return;
    if (!cookie.hasTableId(table.data.id)) {
      table.upload();
      cookie.addTableId(table.data.id);
    } else {
      container.down('#sampwt-broadcast').style.display = 'block';
    }
    
    if (table.domInitialized) return;
    table.addCheckboxes();
    table.underlineCoords();
    table.domInitialized = true;
  }
  
  function onConnectionFail() {
    if (!SampWT.defaultHubUrl || waitingForHubInterval) return;
    
    waitingForHubInterval = setInterval(function(){
      WebSampConnector.connect();
    }, 3000);
    
    document.body.appendChild(new Element('iframe', {src: SampWT.defaultHubUrl, style: 'width:0; height:0;'}));
  }

  function hubEventsHandler(eventName, data) {
    console.log(eventName);
    switch (eventName) {
      case 'disconnect':
      case 'event.shutdown':
        disconnect();
        break;
      case 'event.register':
        //clients.registered(data);
        break;
      case 'event.unregister':
        //clients.unregistered(data);
        break;
    }
  }
  
  function highlightRowHandler(tableId, url, rowIndex) {
    if (browserIsForeground) return;
    
    if (table.data.id != tableId || table.data.url != url) return;
    
    var row = table.node.down('tr[data-index="' + rowIndex + '"]');
    if (!row || row == highlightedRow) return;
    
    highlightedRow && highlightedRow.removeClassName('sampwt-highlighted');
    highlightedRow = row;
    highlightedRow.addClassName('sampwt-highlighted');
    
    var offset = highlightedRow.viewportOffset();
    if (offset.top > 0 && offset.top < document.viewport.getHeight()) return;
    highlightedRow.scrollIntoView();
  }
  
  function selectRowListHandler(tableId, url, rows) {
    if (browserIsForeground) return;

    highlightedRow && highlightedRow.removeClassName('sampwt-highlighted');
    highlightedRow = null;

    if (someRowsAreSelected) {
      var current = table.node.select('input[type=checkbox]:checked');
      current.each(function(checkbox){
        checkbox.checked = false;
        // up.up is faster than up('tr')
        checkbox.up().up().removeClassName('sampwt-selected');
      });
    }
    if (rows.length == 0) return;
    
    $A(rows).each(function(index, notFirst){
      var row = table.node.down('tr[data-index="' + index + '"]')
      if (!row) return;
      
      $(row).addClassName('sampwt-selected');
      row.down('input').checked = true;
      
      if (!notFirst) {
        var offset = row.viewportOffset();
        if (offset.top > 0 && offset.top < document.viewport.getHeight()) return;
        row.scrollIntoView();
      }
    });
    
    someRowsAreSelected = true;
  }
  
  function makeLinksBroadcastable() {
    var button = new Element('button');
    button.innerHTML = 'Broadcast';
    button.observe('click', function(event){
      event.stop();
      var link = event.findElement('a');
      
      if (!ensureWscIsConnected()) return;
      WebSampConnector.sendMsg('table.load.votable', link.getDataset().votableid, link.title || link.textContent, link.href, '');
    });
    $$('a[data-votableId]').each(function(link){
      link.observe('mouseover', function(){ link.insert({bottom: button}) });
      link.observe('mouseout', function(event){ if (event.relatedTarget != button) button.remove() });
    });
  }
  
  var cookie = {
    sampwtOn: function(){ return document.cookie.match(/\bSampWT=1\b/) },
    set: function(){ document.cookie = 'SampWT=1;path=/' },
    unset: function(){document.cookie = 'SampWT=0;path=/' },
    hasTableId: function(id) { return $A(this.getTables()).include(id); },
    addTableId: function(id) { document.cookie = 'SampWTTables=' + this.getTables().concat(id).join('|') + ';path=/'; },
    getTables: function(id) {
      var match = document.cookie.match(/\bSampWTTables=(.*?)(;|$)/);
      if (!match) return [];
      return match[1].split('|');
    }
  };
  
  var table = {
    node: null,
    data: null,
    domInitialized: false,
    
    clickHandler: function(event){
      var element = event.element();
      if (element.match('table')) return;
      
      if (element.match('input[type=checkbox]')) {
        this.checkboxHandler.bind(this).defer(element);
        return;
      }
      
      var cell = event.findElement('td');
      var row = event.findElement('tr');
      if (row && cell && cell.down('span.sampwt-coords')) this.coordsHandler(row);
    },
    
    checkboxHandler: function(element) {
      if (!ensureWscIsConnected()) return;
      
      var checked = element.checked;
      var method = checked ? 'addClassName' : 'removeClassName';
      
      if (element.up().match('td')) {
        element.up('tr')[method]('sampwt-selected');

      } else {      
        this.node.select('input[type=checkbox]').each(function(checkbox){
          checkbox.checked = checked;
        });
        $A(this.node.rows).each(function(row, index){
          if (index == 0) return;
          $(row)[method]('sampwt-selected');
        });
      }
      
      var list = this.node.select('input[type=checkbox]:checked');
      var ids = list.map(function(input){
        // up.up is faster than up('tr')
        return input.up().up().getDataset().index;
      });
      if (ids[0] === undefined) ids.shift();
      
      someRowsAreSelected = !!ids.length;
      
      WebSampConnector.tableSelectRowList(this.data.id, this.data.url, ids);
    },
    
    coordsHandler: function(row) {
      if (!ensureWscIsConnected()) return;
      
      var data = row.getDataset();
      var coords = data.coords;
      if (!coords) return;
      
      if (WebSampConnector.getSubscribedClients('coord.pointAt.sky').length == 0) {
        alert('No application is subscribed to coordinates');
        return;
      }
      
      if (SampWT.aladinScript) {
        WebSampConnector.sendAladinScript(SampWT.aladinScript.interpolate(data));
      } else {
        var coords = coords.split(' ');
        var ra  = sexaToDec(coords[0]);
        var dec = sexaToDec(coords[1]);
        WebSampConnector.pointAtSky(ra, dec);
      }
    },
    
    hoverHandler: function(event){
      if (!wscIsConnected) return;
      if (!ensureWscIsConnected()) return;
      
      var element = event.element();
      if (element.match('table')) return;
  
      var row = event.findElement('tr');
      if (!row) return;
      
      var data = row.getDataset();
      if (!data.index || highlightedRow == row) return;
      
      highlightedRow && highlightedRow.removeClassName('sampwt-highlighted');
      highlightedRow = row;
      highlightedRow.addClassName('sampwt-highlighted');
      
      WebSampConnector.tableHighlightRow(this.data.id, this.data.url, data.index);
    },
    
    upload: function() {
      if (!ensureWscIsConnected()) return;
      
      WebSampConnector.sendMsg('table.load.votable', this.data.id, this.data.title, this.data.url, '');
    },
    
    addCheckboxes: function() {
      var checkbox = new Element('input', {type: "checkbox"});
      var td = new Element('td');
      var th = new Element('th');
      td.appendChild(checkbox);
      th.appendChild(checkbox.cloneNode(true));
      
      $A(this.node.rows).each(function(row, index){
        var node = (index === 0) ? th : td;
        row.insert({ top: node.cloneNode(true) });
      });
    },
    
    underlineCoords: function() {
      var indexes = [];
      this.node.select('col').each(function(col, index){
        if (col.hasClassName('sampwt-has-coords')) indexes.push(index + 1); // +1 compensates added checkbox td
      });
      if (indexes.length == 0) return;
      
      var span = new Element('span', {className: 'sampwt-coords'});
      $A(this.node.rows).each(function(row, index){
        if (index == 0) return;
        
        indexes.each(function(index){
          var newSpan = span.cloneNode(false);
          row.cells[index].insert({ top: newSpan });
          newSpan.appendChild(newSpan.nextSibling);
        });
      });
    },
    
    makeSortable: function() {
      var cells = this.node.select('th');

      var activeIndex;
      var sortOrderAsc;
      var rows;
      
      cells.each(function(cell, index){
        if (!cell.innerHTML.match(/[▽△]/)) return;
        activeIndex = index;
        sortOrderAsc = cell.innerHTML.match(/▽/);
      });
      
      this.node.down('tr').observe('click', function(event){
        var target = event.findElement('th');
        var checkbox = target.down();
        if (checkbox && checkbox.match('input[type=checkbox]')) return;
        
        var index = cells.indexOf(target);
        if (activeIndex !== index) sortOrderAsc = true;
        
        if (target.parentNode.cells[index] != target) {
          index++;
          activeIndex++;
          cells = this.node.select('th');
        }
        
        var type = target.getDataset().type || 'float';
        
        if (!rows) {
          rows = $A(this.node.rows);
          rows.shift();
        }
        
        var ref = {};
        var values = [];
        rows.each(function(row){
          var cell = row.cells[index];
          var value = normalizeValue(cell.textContent, type);
          
          if (!(value in ref)) {
            ref[value] = [row];
          } else {
            ref[value].push(row);
          }
          values.push(value);
        });
        
        var tbody = this.node.down('tbody');
  
        values = values.uniq();
        if (type == 'string') {
          values.sort(naturalSort);
        } else {
          values.sort(numericSort);
        }
        
        if (!sortOrderAsc && activeIndex == index) values.reverse();
        
        var fragment = document.createDocumentFragment();
        values.each(function(value){
          ref[value].each(function(row){ fragment.appendChild(row); });
        });
        tbody.appendChild(fragment);
        
        var current = cells[activeIndex];
        current.innerHTML = current.innerHTML.replace(/[▽△]/g, '');
        target.innerHTML += sortOrderAsc ? '△' : '▽';
        
        activeIndex = index;
        sortOrderAsc = !sortOrderAsc;
      }.bind(this));
      
      function normalizeValue(value, type) {
        switch (type) {
          case 'string':
            return value;
          case 'sexagesimal':
            return parseFloat(value.replace(/(^|\D)(\d)(?=\D|$)/g, '$10$2').replace(/:/g, ''));
          default:
            return parseFloat(value.replace(/^[^\d+-]+/, ''));
        }
      }
      
      function numericSort(a, b) {
        if (isNaN(a)) return 1;
        if (isNaN(b)) return -1;
        if (a == b) return 0;
        if (a < b) return -1;
        return 1;
      }
      
      function naturalSort(a, b) {
        var aMatch = a.match(/^(\D*)(\d+)/);
        var bMatch = b.match(/^(\D*)(\d+)/);
        
        if (aMatch && bMatch) {
          if (aMatch[1] < bMatch[1]) return -1;
          if (aMatch[1] > bMatch[1]) return 1;
  
          var aNum = parseFloat(aMatch[2]);
          var bNum = parseFloat(bMatch[2]);
          if (aNum < bNum) return -1;
          if (aNum > bNum) return 1;
        }

        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
      }
    }
  };
  
  var clients = {
    node: null,
    
    getKnown:   function(id){ return clients.knownNode  .down('dd[data-name="' + id + '"]') },
    getUnknown: function(id){ return clients.unknownNode.down('dd[data-name="' + id + '"]') },
    
    registered: function(id, iconUrl) {
      var dd = clients.getKnown(id);
      if (!dd) return false;
      
      dd.className = 'sampwt-on';
      
      if (!iconUrl) return true;
      var image = dd.previous().down('img');
      image.src = iconUrl;
      image.style.display = 'inline';
      
      return true;
    },
    
    unregistered: function(id) {
      var dd;
      if ((dd = clients.getKnown(id))) {
        dd.className = 'sampwt-off';
        var image = dd.previous().down('img');
        image.removeAttribute('src');
        image.style.display = '';
        
      } else if ((dd = clients.getUnknown(id))) {
        dd.previous().remove();
        dd.remove();
      }
    },
    
    updateList: function() {
      var unknown = '';
      
      $A(WebSampConnector.getRegisteredClients()).each(function(client){
        if (client.id == 'hub' || client.name == 'WebSampConnector') return;
        
        if (!clients.registered(client.name, client.iconUrl)) {
          unknown +=
            ('<dt><img src="#{iconUrl}" style="display: inline;">#{name}</dt>: ' +
            '<dd data-id="#{id}" data-name="#{name}" class="sampwt-on">' +
            '<span class="started">started</span></dd>').
            interpolate(client);
        }
      });
      clients.unknownNode.innerHTML = unknown;
    }
  };
  
  function ensureWscIsConnected() {
    var error = '';
    try {
      wscIsConnected = wscIsConnected && WebSampConnector.isConnected();
    } catch (e) {
      error = 'Error: ' + e;
      wscIsConnected = false;
    }
    
    if (!wscIsConnected) {
      disconnect();
      alert('VO mode is off, please turn it on. ' + error);
    }
    return wscIsConnected;
  }
  
  function log(message) {
    if (window.console) {
      console.log(message);
    } else if (window.opera && opera.postError) {
      opera.postError(message);
    } else {
      alert(message);
    }
  }

  function sexaToDec(sexa) {
    var parts = sexa.split(':');
    return 3600 * parts[0] + 60 * parts[1] + 1 * parts[2];
  }

  return {
    init: init,
    connect: connect,
    disconnect: disconnect,
    table: table
  };  
})();

document.observe('dom:loaded', function(){ SampWT.init(); });
//window.onload = function(){ SampWT.init(); };

