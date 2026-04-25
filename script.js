import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf5f5f5);

const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 1, 50000);
camera.position.set(2500, 2000, 3000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
scene.add(new THREE.AmbientLight(0xffffff, 0.9));
const light = new THREE.DirectionalLight(0xffffff, 0.4);
light.position.set(2000, 3000, 1000);
scene.add(light);
scene.add(new THREE.GridHelper(5000, 50));

let numeroModuliAttuale = 0;

function pulisciScena() {
    const toRemove = [];
    scene.traverse(obj => { if(obj.name === "pezzoModello") toRemove.push(obj); });
    toRemove.forEach(obj => scene.remove(obj));
}

function creaPannello(w, h, d, x, y, z, color) {
    const geometry = new THREE.BoxGeometry(w, h, d);
    const material = new THREE.MeshPhongMaterial({ color: color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "pezzoModello";
    mesh.position.set(x, y, z);
    scene.add(mesh);

    const edges = new THREE.EdgesGeometry(geometry);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.2 }));
    line.name = "pezzoModello";
    line.position.set(x, y, z);
    scene.add(line);
}

function creaAntaSagomata(xLeft, yBottom, zBack, w, hL, hR, spessore, color) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(w, 0);
    shape.lineTo(w, hR);
    shape.lineTo(0, hL);
    shape.closePath();

    const extrudeSettings = { depth: spessore, bevelEnabled: false };
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const material = new THREE.MeshPhongMaterial({ color: color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "pezzoModello";
    mesh.position.set(xLeft, yBottom, zBack);
    scene.add(mesh);

    const edges = new THREE.EdgesGeometry(geometry);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.2 }));
    line.name = "pezzoModello";
    line.position.set(xLeft, yBottom, zBack);
    scene.add(line);
}

function calcolaBottomStrutturaY(x, tipo, pIn, aIn, gRetti, hMin) {
    const m = -aIn / pIn;
    const theta = Math.atan(aIn / pIn);
    const Y_bottom_tread_0 = hMin + 20 + ((gRetti - 1) * aIn); 
    const offsetBottom = (tipo === 'Cremagliera') ? (120 / Math.cos(theta)) : (15 / Math.cos(theta));
    return m * x + Y_bottom_tread_0 - offsetBottom;
}

function creaFasciaStruttura(tipo, pIn, aIn, gRetti, hMin, spessoreFascia, color) {
    const m = -aIn / pIn;
    const theta = Math.atan(aIn / pIn);
    
    const Y_bottom_tread_0 = hMin + 20 + ((gRetti - 1) * aIn);
    const offsetBottom = (tipo === 'Cremagliera') ? (120 / Math.cos(theta)) : (15 / Math.cos(theta));
    const bottomY = (x) => m * x + Y_bottom_tread_0 - offsetBottom;

    const pts = [];
    const xEndTotal = (gRetti * pIn) + 40.6; 
    
    const yCut = hMin + 20 + gRetti * aIn;

    if (tipo === 'Lineare') {
        const Y_top_0 = Y_bottom_tread_0 + 40.6;
        const q_noses = Y_top_0 - m * (pIn + 40.6);
        const offsetTop = 20 / Math.cos(theta);
        const topY = (x) => m * x + q_noses + offsetTop;

        const xCutTop = (yCut - q_noses - offsetTop) / m;

        pts.push(new THREE.Vector2(0, bottomY(0)));
        pts.push(new THREE.Vector2(xEndTotal, bottomY(xEndTotal)));
        pts.push(new THREE.Vector2(xEndTotal, topY(xEndTotal)));
        
        if (xCutTop > 0) {
            pts.push(new THREE.Vector2(xCutTop, yCut));
            pts.push(new THREE.Vector2(0, yCut));
        } else {
            pts.push(new THREE.Vector2(0, topY(0)));
        }
    } else { // Cremagliera
        const x_start = 0; 
        
        pts.push(new THREE.Vector2(x_start, bottomY(x_start)));
        pts.push(new THREE.Vector2(xEndTotal, bottomY(xEndTotal)));
        pts.push(new THREE.Vector2(xEndTotal, hMin + 20 + 40.6));
        
        for (let k = gRetti - 1; k >= 0; k--) {
            let y_top = hMin + 20 + ((gRetti - 1 - k) * aIn) + 40.6;
            
            if (k > 0) {
                let x_riser_front = (k * pIn) + 40.6;
                pts.push(new THREE.Vector2(x_riser_front, y_top));
                let y_next_top = hMin + 20 + ((gRetti - 1 - (k - 1)) * aIn) + 40.6;
                pts.push(new THREE.Vector2(x_riser_front, y_next_top));
            } else {
                let x_riser_front = 40.6;
                pts.push(new THREE.Vector2(x_riser_front, y_top));
                pts.push(new THREE.Vector2(x_riser_front, yCut));
                pts.push(new THREE.Vector2(x_start, yCut));
            }
        }
    }

    const shape = new THREE.Shape(pts);
    const extrudeSettings = { depth: spessoreFascia, bevelEnabled: false };
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const material = new THREE.MeshPhongMaterial({ color: color });

    const thresholdAngle = 20;

    const meshSX = new THREE.Mesh(geometry, material);
    meshSX.name = "pezzoModello";
    meshSX.position.set(0, 0, -spessoreFascia);
    scene.add(meshSX);
    const edgesSX = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, thresholdAngle), new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.2 }));
    edgesSX.name = "pezzoModello";
    edgesSX.position.set(0, 0, -spessoreFascia);
    scene.add(edgesSX);

    const meshDX = new THREE.Mesh(geometry, material);
    meshDX.name = "pezzoModello";
    meshDX.position.set(0, 0, 600);
    scene.add(meshDX);
    const edgesDX = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, thresholdAngle), new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.2 }));
    edgesDX.name = "pezzoModello";
    edgesDX.position.set(0, 0, 600);
    scene.add(edgesDX);
}

function aggiornaInterfacciaAccessori(numModuli, altezze, passoCassetto, larghezza, profondita) {
    if (numModuli === numeroModuliAttuale) {
        altezze.forEach((h, i) => {
            const labelTitle = document.getElementById(`label-misure-modulo-${i}`);
            const slider = document.getElementById(`cassetti-mod-${i}`);
            if (labelTitle) {
                labelTitle.innerHTML = `Modulo ${i + 1} <span style="color:#666; font-weight:normal;">(${Math.round(larghezza)} x ${Math.round(h)} x ${Math.round(profondita)} mm)</span>`;
            }
            if (slider) {
                const maxPermessi = Math.floor((h - 8) / passoCassetto);
                slider.max = maxPermessi;
                if (parseInt(slider.value) > maxPermessi) slider.value = maxPermessi;
                document.getElementById(`val-cassetti-${i}`).innerText = slider.value;
            }
        });
        return;
    }
    
    numeroModuliAttuale = numModuli;
    const containerAcc = document.getElementById('accessori-container');
    containerAcc.innerHTML = '';

    for (let i = 0; i < numModuli; i++) {
        const hCorrente = altezze[i];
        const maxPermessi = Math.floor((hCorrente - 8) / passoCassetto);

        const div = document.createElement('div');
        div.className = 'modulo-accessorio';
        div.innerHTML = `
            <div id="label-misure-modulo-${i}" style="font-size:12px; font-weight:bold; margin-bottom:10px; color:#007bff;">
                Modulo ${i + 1} <span style="color:#666; font-weight:normal;">(${Math.round(larghezza)} x ${Math.round(hCorrente)} x ${Math.round(profondita)} mm)</span>
            </div>
            <div class="input-group" style="margin-bottom:8px">
                <label style="font-size:10px">Cassetti (Max: ${maxPermessi})</label>
                <input type="range" id="cassetti-mod-${i}" min="0" max="${maxPermessi}" value="0" class="slider-accessorio">
                <div style="text-align:right; font-size:10px; font-weight:bold">Q.tà: <span id="val-cassetti-${i}">0</span></div>
            </div>
            <div class="input-group" style="margin-bottom:0;">
                <label id="label-reggiabiti-${i}" style="display:flex; align-items:center; gap:8px; font-size:11px; font-weight:bold; cursor:pointer; margin:0;">
                    <input type="checkbox" id="reggiabiti-mod-${i}" class="check-accessorio" style="width:16px; height:16px; margin:0; cursor:pointer; display:block;">
                    Aggiungi Reggiabiti
                </label>
            </div>
        `;
        containerAcc.appendChild(div);

        const slider = div.querySelector('.slider-accessorio');
        slider.addEventListener('input', () => {
            document.getElementById(`val-cassetti-${i}`).innerText = slider.value;
            generaArmadio();
        });

        const check = div.querySelector('.check-accessorio');
        check.addEventListener('change', generaArmadio);
    }
}

function generaArmadio() {
    pulisciScena();

    const tipoStruttura = document.getElementById('tipoStruttura').value;
    const pedataIn = parseFloat(document.getElementById('pedata').value) || 0;
    const alzataIn = parseFloat(document.getElementById('alzata').value) || 0;
    const gradinoInizioIn = parseFloat(document.getElementById('gradinoInizio').value) || 0;
    let gradiniRettiIn = parseInt(document.getElementById('gradiniRetti').value) || 0;
    if (gradiniRettiIn % 2 !== 0) gradiniRettiIn += 1;

    const colorInt = document.getElementById('coloreInterno').value;
    const colorEst = document.getElementById('coloreEsterno').value;
    const showAnte = document.getElementById('showAnte').checked;

    const numeroModuli = gradiniRettiIn / 2;
    const luce = pedataIn * gradiniRettiIn;
    
    const altezzaMinimaVal = (alzataIn * gradinoInizioIn) - 60.6;
    const passoCassetto = altezzaMinimaVal / 2;

    const profondita = 600;
    const larghezzaModulo = (luce - 60) / numeroModuli;
    const deltaAltezza = alzataIn * 2;
    
    const spessore = 19;
    const hZoccolo = 45;
    const spessoreSchienale = 5;
    const aria = 3;

    let altezzeModuli = [];
    for (let i = 0; i < numeroModuli; i++) {
        altezzeModuli.push(altezzaMinimaVal + ((numeroModuli - 1 - i) * deltaAltezza));
    }
    aggiornaInterfacciaAccessori(numeroModuli, altezzeModuli, passoCassetto, larghezzaModulo, profondita);

    let startX = 0;
    for (let i = 0; i < numeroModuli; i++) {
        const hCorrente = altezzeModuli[i];
        const wInterno = larghezzaModulo - (spessore * 2);
        const numCassetti = parseInt(document.getElementById(`cassetti-mod-${i}`)?.value) || 0;
        
        const checkboxReggiabiti = document.getElementById(`reggiabiti-mod-${i}`);
        const labelReggiabiti = document.getElementById(`label-reggiabiti-${i}`);

        const altezzaBaseUtile = (numCassetti > 0) ? (8 + (numCassetti * passoCassetto)) : (hZoccolo + spessore);
        const luceInterna = (hCorrente - spessore) - altezzaBaseUtile;

        if (checkboxReggiabiti && labelReggiabiti) {
            if (luceInterna >= 1000) {
                checkboxReggiabiti.disabled = false;
                labelReggiabiti.style.opacity = "1";
            } else {
                checkboxReggiabiti.checked = false;
                checkboxReggiabiti.disabled = true;
                labelReggiabiti.style.opacity = "0.4";
            }
        }

        // Struttura Armadio
        creaPannello(spessore, hCorrente, profondita, startX + (spessore / 2), hCorrente / 2, profondita / 2, colorInt);
        creaPannello(spessore, hCorrente, profondita, startX + larghezzaModulo - (spessore / 2), hCorrente / 2, profondita / 2, colorInt);
        creaPannello(wInterno, spessore, profondita, startX + (larghezzaModulo / 2), hCorrente - (spessore / 2), profondita / 2, colorInt);
        creaPannello(wInterno, spessore, profondita, startX + (larghezzaModulo / 2), hZoccolo + (spessore / 2), profondita / 2, colorInt);
        creaPannello(wInterno, hZoccolo, spessore, startX + (larghezzaModulo / 2), hZoccolo / 2, profondita - 5 - (spessore / 2), colorInt);

        // Schienale
        const hSchienale = hCorrente - (spessore * 2) - hZoccolo;
        creaPannello(wInterno, hSchienale, spessoreSchienale, startX + (larghezzaModulo / 2), hZoccolo + spessore + (hSchienale / 2), 10 + (spessoreSchienale / 2), colorInt);

        // --- TAMPONAMENTO CREMAGLIERA ---
        if (tipoStruttura !== 'Lineare') {
            const wTamp = pedataIn - 20; 
            const hTamp = alzataIn;
            if (wTamp > 0 && hTamp > 0) {
                creaPannello(wTamp, hTamp, spessore, startX + (wTamp / 2), hCorrente + (hTamp / 2), profondita - (spessore / 2), colorInt);
            }
        }

        // Ripiano Interno
        if (numCassetti > 0) {
            const altezzaBaseRipiano = 8 + (numCassetti * passoCassetto);
            creaPannello(wInterno, spessore, profondita, startX + (larghezzaModulo / 2), altezzaBaseRipiano - (spessore / 2), profondita / 2, colorInt);
        }

        // Reggiabiti
        if (checkboxReggiabiti && checkboxReggiabiti.checked) {
            const coloreReggiabiti = 0x999999;
            const wSostegno = 12, hSostegno = 63, dSostegno = 19;
            const wSbarra = wInterno - 24, hSbarra = 30, dSbarra = 7;
            const ySostegno = hCorrente - spessore - (hSostegno / 2);
            
            creaPannello(wSostegno, hSostegno, dSostegno, startX + spessore + (wSostegno / 2), ySostegno, profondita / 2, coloreReggiabiti);
            creaPannello(wSostegno, hSostegno, dSostegno, startX + larghezzaModulo - spessore - (wSostegno / 2), ySostegno, profondita / 2, coloreReggiabiti);
            
            const ySbarra = (hCorrente - spessore - hSostegno) + (hSbarra / 2);
            creaPannello(wSbarra, hSbarra, dSbarra, startX + (larghezzaModulo / 2), ySbarra, profondita / 2, coloreReggiabiti);
        }

        // Frontali e Ante Sagomate
        if (showAnte) {
            const wFrontale = larghezzaModulo - aria;
            const quotaTerra = 8;
            let yOccupataDaCassetti = 0;

            for (let j = 0; j < numCassetti; j++) {
                const hFrontaleCassetto = passoCassetto - aria; 
                const yPos = quotaTerra + yOccupataDaCassetti + (hFrontaleCassetto / 2);
                creaPannello(wFrontale, hFrontaleCassetto, spessore, startX + (larghezzaModulo / 2), yPos, profondita + (spessore / 2), colorEst);
                yOccupataDaCassetti += passoCassetto; 
            }

            const xLeft = startX + (aria / 2);
            const xRight = xLeft + wFrontale;
            const yStartAnta = quotaTerra + yOccupataDaCassetti;
            
            const yStrutturaLeft = calcolaBottomStrutturaY(xLeft, tipoStruttura, pedataIn, alzataIn, gradiniRettiIn, altezzaMinimaVal);
            const yStrutturaRight = calcolaBottomStrutturaY(xRight, tipoStruttura, pedataIn, alzataIn, gradiniRettiIn, altezzaMinimaVal);
            
            const hLeft = yStrutturaLeft - 20 - yStartAnta;
            const hRight = yStrutturaRight - 20 - yStartAnta;

            if (hLeft > 0 && hRight > 0) { 
                creaAntaSagomata(xLeft, yStartAnta, profondita, wFrontale, hLeft, hRight, spessore, colorEst);
            }
        }

        startX += larghezzaModulo;
    }

    // --- TAMPONAMENTO LINEARE (Geometria Singola Continua) ---
    // Genera un UNICO pannello per tutta l'area da coprire, eliminando le linee interne.
    if (tipoStruttura === 'Lineare') {
        const luceArmadio = numeroModuli * larghezzaModulo; 
        
        // Funzione per calcolare l'altezza sicura dal tetto (-5mm di aria) per un dato punto x
        function getSafeTopY(x) {
            let k = Math.floor((x + 5) / pedataIn);
            if (k < 0) k = 0;
            if (k > gradiniRettiIn - 1) k = gradiniRettiIn - 1;
            return altezzaMinimaVal + 20 + ((gradiniRettiIn - 1 - k) * alzataIn) - 5;
        }

        const pts = [];
        
        // 1. Tracciamento base (segue i tetti dei moduli, da sinistra a destra)
        pts.push(new THREE.Vector2(0, altezzeModuli[0]));
        for (let i = 0; i < numeroModuli; i++) {
            let x1 = i * larghezzaModulo;
            let x2 = (i + 1) * larghezzaModulo;
            let y = altezzeModuli[i];
            
            if (i > 0) {
                pts.push(new THREE.Vector2(x1, altezzeModuli[i - 1])); // Scalino verso il modulo più basso
            }
            pts.push(new THREE.Vector2(x1, y));
            pts.push(new THREE.Vector2(x2, y));
        }

        // 2. Tracciamento superiore (segue le pedate a -5mm, da destra a sinistra)
        let changes = [];
        for (let k = gradiniRettiIn; k >= 1; k--) {
            let cx = k * pedataIn - 5; // I punti dove la scala "sale" guardando da destra a sinistra
            if (cx < luceArmadio && cx > 0) {
                changes.push(cx);
            }
        }

        let last_top_y = getSafeTopY(luceArmadio);
        pts.push(new THREE.Vector2(luceArmadio, last_top_y));

        for (let i = 0; i < changes.length; i++) {
            let cx = changes[i];
            // Va orizzontale fino al punto di cambio gradino
            pts.push(new THREE.Vector2(cx, last_top_y));
            // Calcola la nuova altezza del gradino superiore
            let new_y = getSafeTopY(cx - 0.1);
            // Sale in verticale
            pts.push(new THREE.Vector2(cx, new_y));
            last_top_y = new_y;
        }

        // Chiude tornando al punto 0 (parete sinistra)
        pts.push(new THREE.Vector2(0, last_top_y));

        // Creazione dell'unica Mesh
        const shape = new THREE.Shape(pts);
        const extrudeSettings = { depth: spessore, bevelEnabled: false };
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const material = new THREE.MeshPhongMaterial({ color: colorInt });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = "pezzoModello";
        mesh.position.set(0, 0, profondita - spessore); 
        scene.add(mesh);
        
        const edges = new THREE.EdgesGeometry(geometry, 20); // Disegna i contorni perimetrali
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.2 }));
        line.name = "pezzoModello";
        line.position.set(0, 0, profondita - spessore);
        scene.add(line);
    }

    // --- COSTRUZIONE FASCIA STRUTTURA LATERALE ---
    creaFasciaStruttura(tipoStruttura, pedataIn, alzataIn, gradiniRettiIn, altezzaMinimaVal, 8, colorEst);

    // --- COSTRUZIONE GRADINI E ALZATE IN LEGNO ---
    const spessoreLegnoScala = 40.6;
    const coloreScala = 0x966F33; 
    
    for (let k = 0; k < gradiniRettiIn; k++) {
        const quotaY = altezzaMinimaVal + 20 + ((gradiniRettiIn - 1 - k) * alzataIn);
        const quotaX = k * pedataIn;

        const wPedata = pedataIn + spessoreLegnoScala;
        creaPannello(wPedata, spessoreLegnoScala, profondita, quotaX + wPedata/2, quotaY + spessoreLegnoScala/2, profondita/2, coloreScala);

        const hAlzata = alzataIn - spessoreLegnoScala;
        const centerXYAlzata = quotaY - hAlzata/2;
        creaPannello(spessoreLegnoScala, hAlzata, profondita, quotaX + pedataIn + spessoreLegnoScala/2, centerXYAlzata, profondita/2, coloreScala);
    }

    const hAlzataUltima = alzataIn - spessoreLegnoScala;
    const yTop0 = altezzaMinimaVal + 20 + ((gradiniRettiIn - 1) * alzataIn) + spessoreLegnoScala;
    creaPannello(spessoreLegnoScala, hAlzataUltima, profondita, spessoreLegnoScala/2, yTop0 + hAlzataUltima/2, profondita/2, coloreScala);
}

const inputs = document.querySelectorAll('#sidebar input:not(.check-accessorio):not(.slider-accessorio), #sidebar select, #showAnte');
inputs.forEach(el => {
    el.addEventListener('input', generaArmadio);
});

window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

generaArmadio();
animate();