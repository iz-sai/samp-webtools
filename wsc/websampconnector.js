/**
 * WebSampConnector Toolkit.
 * 
 * This file contains the Javascript object associated to the WebSampConnector
 * Java applet. It defines the WebSampConnector namespace and its properties.
 * 
 * @see http://vo.imcce.fr/webservices/wsc 
 * @author J. Berthier <berthier@imcce.fr> (IMCCE/OBSPM/VOParis Data Centre)
 * @author A. Tregoubenko <http://arty.name>
 * @version 1.5, 2010-04-01
 * @copyright 2010, VO-Paris Data Centre <http://vo.obspm.fr/>
 * @license CeCILL-C FREE SOFTWARE LICENSE <http://www.cecill.info>
 */
var WebSampConnector = {

   /**
    * Id of the Japplet tag (to be overrided by client)
    */
   jAppletId: 'WebSampConnectorApplet',
   /**
    * Absolute path to the JApplet directory (to be overrided by client)
    */
   jAppletCodeBase: './',
   /**
    * Version of the WebSampConnector JApplet
    */
   jAppletVersion: '1.5',

   // Becomes true if IE is used
   IE: window.navigator.appName.indexOf("Microsoft Internet Explorer") != -1,

   // Minimum version of JDK to use
   javaVersion: '1.6',
   
   /**
    * Client configuration method to override default configuration values
    * @param options a key:value structure to override the default values of jAppletId, jAppletCodeBase and jAppletVersion
    */
   configure: function(options) {
      this.jAppletId        = options.jAppletId        || this.jAppletId;
      this.jAppletCodeBase  = options.jAppletCodeBase  || this.jAppletCodeBase;
      this.jAppletVersion   = options.jAppletVersion   || this.jAppletVersion; 
   },

   /**
    * Logs a message
    * @param message the message to display 
    */
   log: function(message) {
      if (window.console) {
         console.log(message);
      } else if (window.opera && opera.postError) {
         opera.postError(message);
      } else {
         alert(message);
      }
   },

   /**
    * Returns the JApplet HTML element
    * @return a reference to the HTML element with id=WebSampConnector.jAppletId 
    */
   getApplet: function() {
      return document.getElementById(WebSampConnector.jAppletId);
   },

   /**
    * Generic method to broadcast messages to the hub
    * @param methodName the name of the Java method to execute (e.g. 'sendMsg')
    * @return the result sent by the called method
    */
   proxyMethod: function(methodName) {
      return function() {
         var applet = this.getApplet();
         if (!applet) {
            throw new Error('WebSampConnector.proxyMethod: cannot find applet, call WebSampConnector.connect() before calling other methods.');
         }
         // Test if the connection is active
         if (methodName != 'isConnected' && methodName != 'connect') {
            if (!applet.isConnected()) {
               throw new Error('WebSampConnector.proxyMethod: applet is not connected to hub.');
            }
         }
         // Call Java method
         if (!this.IE) {
            return applet[methodName].apply(applet, arguments);
         }
         // Workaround for IE to call Java method
         var a = arguments[0];
         var b = arguments[1];
         var c = arguments[2];
         var d = arguments[3];
         var e = arguments[4];
         switch (methodName) {
            case 'disconnect':           return applet.disconnect(); 
            case 'isConnected':          return applet.isConnected();
            case 'sendMsg':              return applet.sendMsg(a,b,c,d,e);
            case 'pointAtSky':           return applet.pointAtSky(a,b);
            case 'tableHighlightRow':    return applet.tableHighlightRow(a,b,c);
            case 'tableSelectRowList':   return applet.tableSelectRowList(a,b,c);
            case 'sendAladinScript':     return applet.sendAladinScript(a);
            case 'getRegisteredClients': return applet.getRegisteredClients();
            case 'getSubscribedClients': return applet.getSubscribedClients(a);
            default: return false;
         }
      }
   },

   /**
    * This method is dedicated to the getRegisteredClients and getSubscribedClients
    * methods, in order to format their outputs properly (i.e. associative array)
    * @param method the method which is concerned (e.g. WebSampConnector.getRegisteredClients)
    * @return an associative array which contains the client information
    */
   migrateClients: function(method) {
      return function() {
         var clients = method.apply(WebSampConnector, arguments);
         var data = [];
         for (var index = 0; index < clients.length; ++index) {
            var client = clients[index];
            data.push({
               'id': client.id,
               'name': client.name,
               'descriptionText': client.descriptionText,
               'descriptionHtml': client.descriptionHtml,
               'iconUrl': client.iconUrl,
               'documentationUrl': client.documentationUrl
            });
         }
         return data;
      }
   },

   /**
    * This method builds the Japplet, and connects and registers the Web browser 
    * to a running Samp hub
    */
   start: function() { 
      // Destroy the old applet if it exists
      var el = this.getApplet();
      if (el) {
         el.parentNode.removeChild(el);
      }
      // Define the applet tag
      if (this.IE) {
         var parameters = " codebase='" + this.jAppletCodeBase + "'"
            + " archive='WebSampConnector-" + this.jAppletVersion + ".jar'"
            + " code='org.voparis.WebSampConnector'" 
            + " mayscript='true'>";
      } else {
         var parameters = ">"
            + " <param name='code' value='org.voparis.WebSampConnector' />"
            + " <param name='codebase' value='" + this.jAppletCodeBase + "' />"
            + " <param name='JAVA_CODEBASE' value='" + this.jAppletCodeBase + "' />"
            + " <param name='archive' value='WebSampConnector-" + this.jAppletVersion + ".jar' />"
            + " <param name='mayscript' value='true' />";
      }
      var applet = "<object type='application/x-java-applet;version=" + this.javaVersion + "'"
         + " id='" + this.jAppletId + "' name='" + this.jAppletId + "'"
         + " archive='WebSampConnector-" + this.jAppletVersion + ".jar'"
         + "  width='0' height='0'"
         + parameters
         + " <span id='wsc-no-java' style='position: absolute; top: 10%; width: 50%; margin: 0 25%; background: white; border: 1px solid black; padding: 1em; text-align: center; '>"
         + " WebSampConnector requires Java plugin version " + this.javaVersion + " or later to run.<br />"
         + " <a href='http://java.sun.com/products/plugin/downloads/'>Get the latest Java plugin here</a> "
         + " or <button onclick='this.parentNode.parentNode.removeChild(this.parentNode)'>hide this message</button></span>"
         + " </object>";
      // Append the applet to the document
      var div = document.createElement("div");
      div.innerHTML = applet;
      document.body.appendChild(div);
   },

   /**
    * This function is used as default NOP handler for all WebSampConnector events
    */
   empty: function() {}

};

/**
 * This method unregisters the client and terminates the connection.
 * @return true if the client is disconnected, false if not 
 */
WebSampConnector.disconnect = WebSampConnector.proxyMethod('disconnect');

WebSampConnector.connect = WebSampConnector.proxyMethod('connect');

/**
 * This method allows the client to know if he is connected to a running Samp hub.
 * @return true if the client is connected, false if not 
 */
WebSampConnector.isConnected = WebSampConnector.proxyMethod('isConnected');

/**
 * This method retrieves the list of client public IDs for those clients currently registered.
 * The output is converted into an associative array by the migrateClients method, and contains
 * all the metadata of the registered applications.
 * @return an associative array which contains the client information
 */
WebSampConnector.getRegisteredClients = WebSampConnector.proxyMethod('getRegisteredClients');
WebSampConnector.getRegisteredClients = WebSampConnector.migrateClients(WebSampConnector.getRegisteredClients);

/**
 * This method retrieves the list of clients which subscribed a given MType.
 * The output is converted into an associative array by the migrateClients method, and contains
 * all the metadata of the registered applications.
 * @param mtype the given MType (e.g. table.load.votable)
 * @return an associative array which contains the client information
 */
WebSampConnector.getSubscribedClients = WebSampConnector.proxyMethod('getSubscribedClients');
WebSampConnector.getSubscribedClients = WebSampConnector.migrateClients(WebSampConnector.getSubscribedClients);

/**
 * This method broadcasts a message from the Web page to VO applications via the Samp hub 
 * @param type the MType of the resource 
 * @param id the Id of the resource 
 * @param name the name of the resource 
 * @param url the URL where is located the resource
 * @param keyName the key of the identifier (cf. param id) which may be used to refer to the loaded resource in subsequent messages
 * @return true if no error occurs, false if not
 * @throws exception if an error occurs
 */
WebSampConnector.sendMsg = WebSampConnector.proxyMethod('sendMsg');

/**
 * This method allows the client to point a given celestial coordinate 
 * in a VO application (e.g. Aladin) by selecting it in the Web page.
 * @param ra the right ascension to point (in degrees)
 * @param dec the declination to point (in degrees)
 * @return true if no error occurs, false if not (if an exception is rises then a message is printed)
 */
WebSampConnector.pointAtSky = WebSampConnector.proxyMethod('pointAtSky');
 
/**
 * This method allows the client to highlight a given row of a table
 * in a VO application (e.g. Aladin) by selecting it in the Web page.
 * @param tableId the Id of the resource (table)
 * @param url the URL where is located the resource
 * @param row the number of the row to highlight (from 0 to n-1)
 * @return true if no error occurs, if not false (if an exception is rises then a message is printed)
 * @throws PrivilegedActionException 
 */
WebSampConnector.tableHighlightRow = WebSampConnector.proxyMethod('tableHighlightRow');
 
/**
 * This method allows the client to highlight a set of rows of the table
 * in a VO application (e.g. Aladin) by selecting them in the Web page.
 * @param tableId the Id of the resource (table)
 * @param url the URL where is located the resource
 * @param rowList an array of integers providing the list of the rows to highlight (from 0 to n-1)
 * @return true if no error occurs, if not false (if an exception is rises then a message is printed)
 */
WebSampConnector.tableSelectRowList = WebSampConnector.proxyMethod('tableSelectRowList');
 
/**
 * This method allows the client to send a script to be executed by Aladin
 * @param ascript a string containing the Aladin script to be executed
 * @return true if no error occurs, if not false (if an exception is rises then a message is printed)
 */
WebSampConnector.sendAladinScript = WebSampConnector.proxyMethod('sendAladinScript');

/**
 * This function is called immediately after the connection has been established.
 * Feel free to override it with your own method to do something right after the
 * connection is ready (e.g. to display a message or to change a connection status icon)
 */
WebSampConnector.onlineHandler = WebSampConnector.empty;

/**
 * ---------------------------------------------------------------------------
 * The following handlers are called by Java applet when it receives specific
 * events from hub. Developers have to write the behavior of these methods to
 * handle these events as required. 
 * ---------------------------------------------------------------------------
 */

/**
 * This method allows a VO application to point a given celestial coordinate in the Web page
 * @param ra the pointed right ascension
 * @param dec the pointed declination
 */
WebSampConnector.pointAtSkyHandler = WebSampConnector.empty;

/**
 * This method allows a VO application to highlight a given row in the Web page.
 * @param tableId the Id of the table which contains the row to highlight
 * @param url the URL of the resource
 * @param row the row index to highlight
 */
WebSampConnector.highlightRowHandler = WebSampConnector.empty;

/**
 * This method allows a VO application to highlight a selection of rows in the Web page
 * @param tableId the Id of the table which contains the rows to highlight
 * @param url the URL of the resource
 * @param rows an array of integers of the row index to highlight
 */
WebSampConnector.selectRowListHandler = WebSampConnector.empty;


WebSampConnector.hubEventsHandler = WebSampConnector.empty;
