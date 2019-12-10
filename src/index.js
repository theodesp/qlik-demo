/* eslint no-console:0 */
const WebSocket = require('ws');
const enigma = require('enigma.js');
const schema = require('enigma.js/schemas/3.2.json');
const Halyard = require('halyard.js');
const mixins = require('halyard.js/dist/halyard-enigma-mixin');

(async () => {
  try {
    console.log('Creating Halyard table data');
    const halyard = new Halyard();
    const airportsPath = '/data/airports.csv';
    const airportsTable = new Halyard.Table(airportsPath, {
      name: 'Airports',
      delimiter: ',',
    });

    halyard.addTable(airportsTable);


    console.log('Creating and opening session...');
    const session = enigma.create({
      schema,
      mixins,
      url: 'ws://localhost:19076/app',
      createSocket: (url) => new WebSocket(url),
    });

    // Get an instance of the engine
    const qlikEngine = await session.open();

    // Create app from engine
    const app = await qlikEngine.createSessionAppUsingHalyard(halyard);

    // Print version
    const version = await qlikEngine.engineVersion();
    console.log(`Engine version retrieved: ${version.qComponentVersion}`);

    console.log('Creating data connection to local dataset');
    await app.createConnection({
      qName: 'data',
      qConnectionString: '/data/',
      qType: 'folder',
    });

    // console.log('Running reload script.');
    // const script = `Airports:
    //                   LOAD * FROM [lib://data/airports.csv]
    //                   (txt, utf8, embedded labels, delimiter is ',');`;
    // await app.setScript(script);
    // await app.doReload();

    console.log('Creating session object with airport names.');
    const count = 10;
    const properties = {
      qInfo: { qType: 'airport-data' },
      qHyperCubeDef: {
        qDimensions: [{ qDef: { qFieldDefs: ['Airport'] } }],
        qInitialDataFetch: [{ qHeight: count, qWidth: 1 }],
      },
    };
    const object = await app.createSessionObject(properties);
    const layout = await object.getLayout();
    const airports = layout.qHyperCube.qDataPages[0].qMatrix;

    console.log(`Listing the ${count} first airports:`);
    airports.forEach((airport) => { console.log(airport[0].qText); });

    await session.close();
    console.log('Session closed...');
  } catch (err) {
    console.log('An error occurred.', err);
    process.exit(1);
  }
})();


