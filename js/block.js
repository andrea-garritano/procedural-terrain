Block = function(ics,ips,tipo){
    /*
     worldWidth, worldDepth, ecc., sono già definite nell'index
     */
    var dataHeights;
    this.x=ics;
    this.y=0;
    this.z=ips;
    this.type=tipo;
    var obj=new THREE.Object3D();
    /*
    type può essere 'center', nord, sud,est,ovest,nordest, ecc..
    posso calcolare offsetX e offsetY in base alla posizione rispetto al centro (0,0,0)
    obj contiene le mesh del blocco e dell'acqua, eliminandolo si elimina entrambi
     */
    var offsetX=ics/planeWidth;
    var offsetY=ips/planeDepth;
    /* Creazione blocco, settaggio altezze, colori e texture) */
    var geometry = new THREE.PlaneBufferGeometry( planeWidth, planeDepth, worldWidth - 1, worldDepth - 1 ); //crea un piano di grandezza planeWidth x planeDepth, suddiviso in sottorettangoli
    geometry.rotateX( -  Math.PI / 2 ); //ruota il piano per renderlo orizzontale
    var vertex = setHeights(((ics+planeWidth)/planeWidth)+10000, ((ips+planeWidth)/planeWidth)+10000); //calcola le altezze di ogni vertice del piano

    var c=document.getElementById("canvas");//restituisce l'elemento del Dom con id='canvas'
    c.width = worldWidth;
    c.height = worldDepth;
    var ctx=c.getContext("2d");


    /*Crea un'immagine grande quanto ogni sottopiano per creare la heightmap*/
    var imgData = ctx.createImageData(worldWidth, worldDepth);
    var i;
    var j = 0;
    for (i = 0; i < worldWidth*worldDepth; i++) {
        var x = (i) % worldWidth, y = ~~ ( (i) / worldDepth );
        imgData.data[j+0] = ((vertex[x][y]+100)/1100)*255;
        imgData.data[j+1] = ((vertex[x][y]+100)/1100)*255;
        imgData.data[j+2] = ((vertex[x][y]+100)/1100)*255;;
        imgData.data[j+3] = 255;
        j += 4;
    }
    ctx.putImageData(imgData, 0, 0);
    var img = new Image();
    img.src = c.toDataURL('png');
    
    var heightmap = loader.load(img.src); //carica la heightmap

    customUniforms = { //crea le variabili uniform da passare allo shader
        heightmap:	{ value: heightmap },
        sandyTexture:	{ type: "t", value: sandyTexture },
        rockyTexture:	{ type: "t", value: rockyTexture },
        snowyTexture:	{ type: "t", value: snowyTexture }
    };

    var customMaterial = new THREE.ShaderMaterial(
        {
            uniforms: customUniforms,
            vertexShader:   document.getElementById( 'vertexShader'   ).textContent,
            fragmentShader: document.getElementById( 'fragmentShader' ).textContent
        }   );

    var mesh = new THREE.Mesh( geometry, customMaterial);
    mesh.position.set(this.x,this.y,this.z);

    /* Water */
    waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;
    var acqua = new THREE.Mesh(
        new THREE.PlaneBufferGeometry(planeWidth,planeWidth, 10, 10),
        water.material
    );
    acqua.add(water);
    acqua.rotation.x = - Math.PI * 0.5;
    acqua.position.set(this.x,0,this.z);
    ////////////
    /* Aggiunta delle mesh all'obj */
    obj.add(mesh);
    obj.add(acqua);

this.getMesh=function(){return obj;};
this.updateCoordinates=function(){
    /* Aggiorna le coordinate del blocco (cioè dell'obj) */
    this.x=mesh.position.x;
    this.y=mesh.position.y;
    this.z=mesh.position.z;
    };

    /* riceve in ingresso gli id dei piani e ritorna una matrice di altezze calcolate con Perlin Noise*/
    function setHeights(squareIdX, squareIdY){
        var vertices = geometry.attributes.position.array;
        dataHeights=new Array(vertices.length);
        var k = 0;
        size = worldWidth*worldDepth; //calcola il numero di vertici
        /*Inizializza la matrice delle altezze dei vertici*/
        var verticesMatrix = [] ;
        for(var x = 0; x < worldWidth; x++){
            verticesMatrix[x] = [];
            for(var y = 0; y < worldDepth; y++){
                verticesMatrix[x][y] = 0;
            }
        }

        perlin = new ImprovedNoise();
        var quality = 5; //serve per gestire le altezze in relazione alle frequenze
        var wideX = 15; //dilatazione rispetto all'asse X
        var wideY = 15; //dilatazione rispetto all'asse Y
        var seaLevel = 30; //altezza del livello del mare
        var height = 2; //moltiplicatore delle altezze di ogni vertice del terreno
        var initX = worldWidth*squareIdX;
        var initY = worldDepth*squareIdY;
        var period = worldWidth;
        /*Si sommano 5 risultati del Perlin, una per ogni frequenza.
          Ogni vertice è visto come un una coordinata (x,y) di un quadrato in 2 dimensioni.
          Per dare continuità al terreno è necessario che l'ultima fila di punti di un quadrato e la prima del quadrato vicino abbiano gli stessi valori. Per questo viene sommato un fattore correttivo per ogni x e y.
          Il fattore correttivo è ugual al lato del quadrato, diviso il numero dei punti
         */
            for (var x = initX; x < (initX)+period; x++) {
                for (var y = initY; y < (initY)+period; y++) {
                    verticesMatrix[x%(initX)][y%(initY)] =0
                        +Math.abs(perlin.noise((wideX*x+wideX*(((x)%(initX)*(1/(period-1))))) / Math.pow(quality,0), (wideY*y+wideY*(((y)%(initY)*(1/(period-1))))) / Math.pow(quality,0), z) * Math.pow(quality,0))
                        +Math.abs(perlin.noise((wideX*x+wideX*(((x)%(initX)*(1/(period-1))))) / Math.pow(quality,1), (wideY*y+wideY*(((y)%(initY)*(1/(period-1))))) / Math.pow(quality,1), z) * Math.pow(quality,1))
                        +Math.abs(perlin.noise((wideX*x+wideX*(((x)%(initX)*(1/(period-1))))) / Math.pow(quality,2), (wideY*y+wideY*(((y)%(initY)*(1/(period-1))))) / Math.pow(quality,2), z) * Math.pow(quality,2))
                        +Math.abs(perlin.noise((wideX*x+wideX*(((x)%(initX)*(1/(period-1))))) / Math.pow(quality,3), (wideY*y+wideY*(((y)%(initY)*(1/(period-1))))) / Math.pow(quality,3), z) * Math.pow(quality,3))
                        +Math.abs(perlin.noise((wideX*x+wideX*(((x)%(initX)*(1/(period-1))))) / Math.pow(quality,4), (wideY*y+wideY*(((y)%(initY)*(1/(period-1))))) / Math.pow(quality,4), z) * Math.pow(quality,4));
                    verticesMatrix[x%(initX)][y%(initY)] *=height; //moltiplica l'altezza del vertice per il fattore height
                    verticesMatrix[x%(initX)][y%(initY)] +=-(5*seaLevel); // sealevel va moltiplicato per il numero di "somme" fatte sopra

                }
            }
        /*definisce il vettore delle altezze, impostando la coordinata Z*/
       for (var i = 0; i<size; i++){
            var x = (i) % worldWidth, y = ~~ ( (i) / worldDepth );
            vertices[k + 1] = verticesMatrix[x][y];
            dataHeights[i] = vertices[k + 1];
            k += 3;
        }
        return verticesMatrix;
    }
};