Configuration of SAMP WebTools
==============================

Script tag
----------

All of the following configuration lines are to be put inside of a script tag,
placed after library's script tag, like that:

    …
    <script src="/sampwt/samp-webtools.js"></script>
    <script>
      // here goes configuration
    </script>
    </body></html>


WebSampConnector
----------------

First you need to provide WebSampConnector library with path where it can access
WebSampConnector-1.5.jar file. This is done as follows:

    WebSampConnector.jAppletCodeBase = '/path/to/jar/';


SampWT urls
-----------

### Help

If you want VO menu to provide some help to site visitors, you should add following
line to configuration:

    SampWT.helpUrl = '/path/to/help/file.html';

### Hub

When visitor of a site turns on VO mode but there's no SAMP messaging hub running
on that computer, SampWT may try to start default hub (or any other application
provided by you). This is done using Java WebStart technology and specially
crafted JNLP file. To enable this behavior, add following line to configuration:

    SampWT.defaultHubUrl = '/path/to/jnlp/file.jnlp';


Tabular data
------------

If there's a data table on a page, SAMP WebTools can enhance it with following
features:

 * Automatically broadcast given VOTable to all or selected VO applications
 * Sort table by any column
 * Synchronize highlighting of rows in all VO applications
 * Execute given Aladin script when clicking on a cell with RA-Dec coords
 
### Configuration

You should have a specific ID for a table, i.e. `data`, and provide SampWT with
this ID as follows:

    SampWT.tableId = 'data';

Note that this configuration line should **ONLY** be included on pages containing
such table.

### Table tag attributes

Table tag should have `id` attribute with table's ID:

    <table id="data" …
    
To embed VOTable data, use following attributes:

    <table id="data"
      data-id="internalSampIDspecificForThatTable" 
      data-title="Human-readable title of a table to be displayed in VO applications" 
      data-url="http://example.com/full/path/to/votable">

### Sort by clicking on TH

To enable sorting of table contents by columns, edit table's first row as follows:

 * Only use `TH` tags for cells (`TH` is semantically correct for headers anyway,
   do not use `TD` there)
   
 * If the table is sorted by default, title (`TH`) of that column should have as
   the last character one of these: `▽△`. First one indicates that table is sorted
   in descending order.
   
 * By default SampWT considers cell content a number, to sort that column as
   strings or sexagecimals, provide `TH` with `data-type` attribute like that:
   
        <th data-type="string">Name</th>
        <th data-type="sexagesimal">α</th>
    
### Syncronized highlighting

To achieve that every row of a table should have ID/index of corresponding row in
associated VOTable. This is done like that:

    <tr data-index="23" …

To highlight multiple rows use checkboxes in the first column.

### Aladin scripts for coordinates

If some column contains RA-Dec coordinated, visitor may execute an Aladin script
by clicking on a cell in this column. To enable this, first put all the required
data in row attributes like that:

    <tr data-coords="00:08:20.4 +51:43:15" data-name="SAI 1" data-radius="2.000">

Then provide SampWT with Aladin script to execute, put it in configuration like
that:

    SampWT.aladinScript = 'get Aladin(DSS2) #{coords} 15arcmin;sync;"UCAC3, #{name}" = get VizieR(UCAC3,allcolumns) #{coords} #{radius}arcmin;sync;set "UCAC3, #{name}" shape=triangle color=red';
    
(Note that in that script `#{coords}` is replaced with contents of `data-coords`
attribute of a clicked row, `#{name}` corresponds to `data-name` etc.)

Then instruct SampWT what columns should be clickable. To do that put one `<col>`
element for each column of your table right before first `<tr>` tag. If a column
should be clickable, add `class="sampwt-has-coords"` as an attribute:

    <col><col class="sampwt-has-coords"><col class="sampwt-has-coords"><col><col>
    

Links to VOTables
-----------------

SAMP provides a simple way to load VOTable into application. If your page has
links to VOTables, you can make them broadcastable to all connected VO apps.
To do that, add `data-votableid="internalSampIDspecificForThatTable"` attribute
to an `<a>` tag linking to the table like that:

    <a href="http://example.com/path/to/votable"
      data-votableid="exampleID">Name of a VOTable</a>

Tag contents would be used as a name for that table by applications. To override
that name, add `title` attribute to a link like that: 

    <a href="http://example.com/path/to/votable"
      data-votableid="exampleID"
      title="Name which will actually be used by applications"
      >Name of a VOTable</a>

When visitor would move mouse over such link, a "Broadcast" button would appear
right next to the link. Clicking the button would broadcast VOTable.
