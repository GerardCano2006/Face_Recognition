import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';

//--- CONFIGURACIÓ INICIAL ---

//Definim les dimensions del vídeo (perquè coincideixi amb el canvas)
const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 480;

//Objecte de traducció per a una interfície més amigable (emojis)
const expressionTranslations = {
  neutral: 'Neutral',
  happy: 'Feliç 😊',
  sad: 'Trist 😢',
  angry: 'Enfadat 😠',
  fearful: 'Espantat 😨',
  disgusted: 'Disgustat 🤢',
  surprised: 'Sorprès 😮',
};

//-----Extra de l'act-----
//Mapa que connecta cada emoció amb un color de fons.
const expressionColors = {
  neutral: '#282c34', //Fosc (color d'App.js per defecte)
  happy: '#2E7D32',
  sad: '#1565C0',
  angry: '#C62828',
  surprised: '#F9A825',
  fearful: '#6A1B9A',
  disgusted: '#795548',
};

//--- COMPONENT PRINCIPAL DE REACT ---

const ExpressionDetector = () => {
  
  //--- ESTATS (La "memòria" del component) ---
  const [modelsLoaded, setModelsLoaded] = useState(false);  //Per saber si els models d'IA estan llestos.
  const [detectedExpression, setDetectedExpression] = useState('Detectant...'); //Per emmagatzemar el text de l'expressió detectada.
  
  //-----Extra de l'act-----
  const [backgroundColor, setBackgroundColor] = useState('#282c34');    //Estat per emmagatzemar el color de fons actual.

  // --- REFERÈNCIES (Accés directe a elements del DOM/Bucle) ---
  const webcamRef = useRef(null); //Referència per accedir al component Webcam.
  const canvasRef = useRef(null); //Referència per accedir a l'element <canvas> on dibuixarem.
  // Referència per guardar l'identificador del bucle (setInterval)
  const intervalRef = useRef(null); 

  // -----CÀRREGA DELS MODELS D'IA (useEffect)-----
  // Aquest 'useEffect' s'executa NOMÉS UN COP quan el component es munta (La seva funció és carregar els models d'IA des de la carpeta /public)
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'; //URL dels models (CDN públic)
      console.log('Carregant models...');
      try {
        await Promise.all([ // Carreguem tots els models en paral·lel per eficiència.
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL), // Detector de cares (ràpid).
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL), // Punts facials (ulls, boca...).
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL), // Detector d'expressions.
        ]);

        //Un cop carregats, actualitzem l'estat.
        setModelsLoaded(true); 
        console.log('Models carregats correctament.');
      } catch (error) {
        console.error('Error carregant els models:', error);
      }
    };
    
    loadModels(); //Cridem la funció de càrrega.

    //Funció de "neteja": s'executa si el component es desmunta (Això evita errors de "memory leak")
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current); //Aturem el bucle.
      }
    };
  }, []); //L'array buit [] assegura que només s'executi un cop.

  
  // -----BUCLE DE DETECCIÓ (setInterval)-----
  // Aquesta funció s'activa un cop la càmera està llesta.
  const startDetection = () => {
    console.log('Iniciant detecció...');

    // Creem un bucle que s'executa cada 500ms (2 cops per segon).
    intervalRef.current = setInterval(async () => {
      if (webcamRef.current && webcamRef.current.video && canvasRef.current && modelsLoaded) {  //Comprovem que tot estigui a punt (càmera, canvas, models).
        
        //1. Obtenir els elements
        const video = webcamRef.current.video;
        const canvas = canvasRef.current;
        
        //2. Sincronitzar mides de vídeo i canvas
        const displaySize = { width: VIDEO_WIDTH, height: VIDEO_HEIGHT };
        faceapi.matchDimensions(canvas, displaySize);

        //3. Detecció d'IA
        // Aquesta és la línia clau: detecta cares, punts i expressions.
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks() //Inclou els 68 punts facials.
          .withFaceExpressions(); //Inclou les 7 expressions.

        //4. Netejar el canvas anterior
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height); //Esborra dibuixos previs.

        //5. Si s'ha detectat una cara...
        if (detections.length > 0) {
          const expressions = detections[0].expressions;  //Trobar l'emoció dominant (ex: happy, sad...)
          const dominantExpression = Object.keys(expressions).reduce((a, b) =>
            expressions[a] > expressions[b] ? a : b
          );

          // Actualitzem el text de l'estat d'ànim (requisits base)
          const translatedExpression = expressionTranslations[dominantExpression] || dominantExpression;
          setDetectedExpression(translatedExpression);

          //-----Extra de l'act-----
          const newColor = expressionColors[dominantExpression] || '#282c34'; //Busquem el color corresponent a l'emoció dominant...
          setBackgroundColor(newColor); // ...i actualitzem l'estat del color de fons.
          
          //Dibuixar al canvas (Feedback visual)
          const resizedDetections = faceapi.resizeResults(detections, displaySize); //Ajustem la mida de les deteccions a la mida del nostre canvas.
          
          faceapi.draw.drawDetections(canvas, resizedDetections); //Dibuixem el requadre de la cara
          faceapi.draw.drawFaceExpressions(canvas, resizedDetections); //Dibuixem l'expressió i la probabilitat
          
          //-----Extra de l'act-----
          //Dibuixem els 68 punts facials (landmarks) sobre la cara.
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

        } else {
          setDetectedExpression('Sense cara detectada'); //Si no es detecta cap cara.
          setBackgroundColor('#282c34'); //Tornem el fons al color per defecte (gris/negre).
        }
      }
    }, 500); // Freqüència del bucle (500ms) o sigui que dos vegades per segon.
  };

  //-----PAS C: DISPARADOR (Trigger)-----
  // Aquesta funció es crida automàticament quan la Webcam
  const handleVideoOnPlay = () => {
    startDetection(); // Inicia el nostre bucle de detecció.
  };

  
  //-----PAS D: RENDERITZAR EL COMPONENT (JSX)-----
  //Aquesta és l'estructura HTML/JSX que es mostrarà a la pàgina.
  return (
    //-----Extra de l'act-----
    //Aquest 'div' principal ara llegeix el color de l'estat 'backgroundColor'.
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: backgroundColor, //El color dinàmic
      transition: 'background-color 0.5s ease', //Transició suau
      padding: '20px'
    }}>
      
      <h2>Detector d'Estat d'Ànim (RA2)</h2>
      
      {/* Missatge de càrrega condicional */}
      {!modelsLoaded ? (
        <p>Carregant models d'IA, si us plau, espereu...</p>
      ) : (
        <p>Models Carregats!</p>
      )}

      {/* Contenidor per superposar webcam i canvas */}
      <div style={{ position: 'relative', width: VIDEO_WIDTH, height: VIDEO_HEIGHT }}>
        
        {/* La càmera web */}
        <Webcam
          ref={webcamRef} //Connectem la referència
          audio={false}
          width={VIDEO_WIDTH}
          height={VIDEO_HEIGHT}
          videoConstraints={{ width: VIDEO_WIDTH, height: VIDEO_HEIGHT, facingMode: 'user' }}
          onUserMedia={handleVideoOnPlay} //El disparador!
          style={{ position: 'absolute', top: 0, left: 0 }} //...per posar-la a sota
        />
        
        {/* El canvas on dibuixem */}
        <canvas
          ref={canvasRef} //Connectem la referència
          style={{ position: 'absolute', top: 0, left: 0 }} //...i posar-lo a sobre
        />
      </div>

      {/* El text de l'estat d'ànim (només es mostra si els models estan llestos) */}
      {modelsLoaded && (
        <h3 style={{ marginTop: '20px', fontSize: '1.5em', color: 'white' }}>
          Estat d'ànim detectat: {detectedExpression}
        </h3>
      )}
    </div>
  );
};

export default ExpressionDetector;