//  För NodeEmberTest/app/puplic/index.html -- aviserar 'ember b -prod ...'-versionen som körs med 'node server.js':
    <div style='position:relative;left:0;top:-10px;margin: 0 0 -27px 0;padding:0;color:red'><small>express server</small></div>

// Förslag till 'production build script' (ember-b-script) att köras i ember-projektkatalogen:
`
ember b -prod --output-path=../public/
cat ../public/index.html | sed 's¡\ *<body>$¡<body><div style='position:relative;left:0;top:-10px;margin: 0 0 -27px 0;padding:0;color:red'><small>express server</small></div>¡ > /tmp/index.html
cp /tmp/index.html ../public/index.html

`