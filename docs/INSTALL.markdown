Installing SAMP WebTools
========================

TLDR version
------------

Put following in <head> section of your page:

    <link rel="stylesheet" href="/sampwt/samp-webtools.css" type="text/css" />
    <script src="/wsc/websampconnector.js"></script>
    <script src="http://ajax.googleapis.com/ajax/libs/prototype/1.6.1.0/prototype.js"></script>
    <script src="/sampwt/samp-webtools.js"></script>

This assumes that contents of `lib` folder was put to `/sampwt/` folder your
webserver's document root, and contents of `wsc` was put to `/wsc/` folder near it.

Extended version
----------------

### CSS

This package provides example of styling for SampWT in `./lib/samp-webtools.css`.
You can either plug this file into page via standard `<link rel="stylesheet">`
OR copy its contents to your stylesheet OR write your own styles.

### JavaScript

To optimize page speed you should put all following `<script>` tags just before
closing body tag `</body>`.

SAMP WebTools need WebSampConnector library to function. It consists of two files:
websampconnector.js and WebSampConnector-1.5.jar. You should put them in the same
folder and plug JS into page via `<script src="/path-to-wsc/websampconnector.js"></script>`.

Also SAMP WebTools relies on PrototypeJS library for cross-browser compatibility.
You can either store prototype.js on your server, plugging it in as usual, or
rely on Google's hosting of javascript libraries, which provides caching and better
access speed for clients.

Only after these two libraries were included in page, you can include SAMP WebTools.
Just plug in samp-webtools.js file.

### SAMP hub

You might want to enable automatic starting of SAMP messaging hub when it is not
started yet. For that you would need to put files topcat-lite.jar and
topcat-lite-hub.jnlp on your server. Also you would need to edit the JNLP file
so that `codebase` attribute of root `<jnlp>` tag concatenated with `href`
attribute would produce link to that JNLP file.

OR you can provide your own JNLP and .jar files with any other application capable
of being SAMP messaging hub. This might result in much less download size for your
visitors and much less traffic from your site.
