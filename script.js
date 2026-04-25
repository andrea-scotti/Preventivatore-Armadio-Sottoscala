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

function aggiornaInterfacciaAccessori(moduliData, passoCassetto, profondita) {
    if (moduliData.length === numeroModuliAttuale) {
        moduliData.forEach((mod, i) => {
            const labelTitle = document.getElementById(`label-misure-modulo-${i}`);
            const slider = document.getElementById(`cassetti-mod-${i}`);
            if (labelTitle) {
                labelTitle.innerHTML = `Modulo ${i + 1} <span style="color:#666; font-weight:normal;">(${Math.round(mod.w)} x ${Math.round(mod.h)} x ${Math.round(profondita)} mm)</span>`;
            }
            if (slider) {
                const maxPermessi = Math.floor((mod.h - 8) / passoCassetto);
                slider.max = maxPermessi;
                if (parseInt(slider.value) > maxPermessi) slider.value = maxPermessi;
                document.getElementById(`val-cassetti-${i}`).innerText = slider.value;
            }
        });
        return;
    }
    
    numeroModuliAttuale = moduliData.length;
    const containerAcc = document.getElementById('accessori-container');
    containerAcc.innerHTML = '';

    moduliData.forEach((mod, i) => {
        const maxPermessi = Math.floor((mod.h - 8) / passoCassetto);
        const div = document.createElement('div');
        div.className = 'modulo-accessorio';
        div.innerHTML = `
            <div id="label-misure-modulo-${i}" style="font-size:12px; font-weight:bold; margin-bottom:10px; color:#007bff;">
                Modulo ${i + 1} <span style="color:#666; font-weight:normal;">(${Math.round(mod.w)} x ${Math.round(mod.h)} x ${Math.round(profondita)} mm)</span>
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
    });
}

function generaArmadio() {
    pulisciScena();

    const piantaScala = document.getElementById('piantaScala')?.value || 'Lineare';
    const pedataIn = parseFloat(document.getElementById('pedata').value) || 250;
    const alzataIn = parseFloat(document.getElementById('alzata').value) || 180;
    const larghezzaRampa = parseFloat(document.getElementById('larghezzaRampa').value) || 800;
    const numeroPedate = parseInt(document.getElementById('numeroPedate').value) || 10;
    const larghezzaUltimaPedata = parseFloat(document.getElementById('larghezzaUltimaPedata').value) || 250;
    
    const colorInt = document.getElementById('coloreInterno').value;
    const colorEst = document.getElementById('coloreEsterno').value;
    const showAnte = document.getElementById('showAnte').checked;

    const profondita = 600; 
    const spessore = 19;
    const hZoccolo = 45;
    const spessoreSchienale = 5;
    const aria = 3;
    const passoCassetto = 160;
    const spessoreLegnoScala = 40.6;

    // ALIGNMENT Z: L'armadio è a filo col fronte della scala (larghezzaRampa)
    const zFrontaleArmadio = larghezzaRampa; 
    const zStartAnteExtrude = zFrontaleArmadio - spessore; // Per la generazione dei poligoni
    const zCenterAnte = zFrontaleArmadio - (spessore / 2); // Per i pannelli standard
    const zCenterCassa = zFrontaleArmadio - spessore - (profondita / 2);
    const zCenterSchienale = zFrontaleArmadio - spessore - profondita + (spessoreSchienale / 2);

    // FUNZIONE DI SUPPORTO: Trova l'altezza sicura (-5mm) sotto i gradini per un dato punto X
    function getSafeTopY(x) {
        let calcX = Math.max(0, x);
        let k = 0;
        if (calcX > larghezzaUltimaPedata) {
            k = 1 + Math.floor((calcX - larghezzaUltimaPedata) / pedataIn);
        }
        if (k >= numeroPedate) k = numeroPedate - 1;
        return (numeroPedate - k) * alzataIn - spessoreLegnoScala - 5;
    }

    // FUNZIONE DI SUPPORTO: Disegna un pannello sagomato che segue perfettamente i gradini in alto
    function creaPannelloZigZag(xStart, xEnd, yBottom, zPos, depth, color) {
        const pts = [];
        pts.push(new THREE.Vector2(xStart, yBottom));
        pts.push(new THREE.Vector2(xEnd, yBottom));
        
        let cx = xEnd;
        let topY = getSafeTopY(cx - 0.1); // -0.1 per prendere il soffitto prima dello scalino
        pts.push(new THREE.Vector2(cx, topY));
        
        // Traccia al contrario trovando i cambi di gradino (alzate)
        if (cx > larghezzaUltimaPedata) {
            let j = Math.floor((cx - larghezzaUltimaPedata - 0.1) / pedataIn);
            let currRiserX = larghezzaUltimaPedata + j * pedataIn;
            
            while (currRiserX > xStart + 0.1) {
                pts.push(new THREE.Vector2(currRiserX, topY));
                topY = getSafeTopY(currRiserX - 0.1);
                pts.push(new THREE.Vector2(currRiserX, topY));
                j--;
                currRiserX = larghezzaUltimaPedata + j * pedataIn;
            }
        }
        pts.push(new THREE.Vector2(xStart, topY));
        
        const shape = new THREE.Shape(pts);
        const extrudeSettings = { depth: depth, bevelEnabled: false };
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const material = new THREE.MeshPhongMaterial({ color: color });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = "pezzoModello";
        mesh.position.set(0, 0, zPos);
        scene.add(mesh);
        
        const edges = new THREE.EdgesGeometry(geometry, 20);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.2 }));
        line.name = "pezzoModello";
        line.position.set(0, 0, zPos);
        scene.add(line);
    }

    // --- LOGICA MODULI (Esattamente 2 pedate per modulo) ---
    const moduliData = [];
    const numModuli = Math.max(0, Math.floor(numeroPedate / 2) - 1);
    let curX = 0;

    for (let i = 0; i < numModuli; i++) {
        let wMod = (i === 0) ? (larghezzaUltimaPedata + pedataIn) : (2 * pedataIn);
        let endX = curX + wMod;
        let safeY = getSafeTopY(endX); 
        let hMod = safeY - 60; // 60mm di aria per il tamponamento superiore
        moduliData.push({ w: wMod, h: hMod });
        curX += wMod;
    }

    aggiornaInterfacciaAccessori(moduliData, passoCassetto, profondita);

    // --- COSTRUZIONE MODULI ARMADIO ---
    let startX = 0;
    for (let i = 0; i < moduliData.length; i++) {
        const mod = moduliData[i];
        const hCorrente = mod.h;
        const larghezzaModulo = mod.w;
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

        // Casse e Schiene
        creaPannello(spessore, hCorrente, profondita, startX + (spessore / 2), hCorrente / 2, zCenterCassa, colorInt);
        creaPannello(spessore, hCorrente, profondita, startX + larghezzaModulo - (spessore / 2), hCorrente / 2, zCenterCassa, colorInt);
        creaPannello(wInterno, spessore, profondita, startX + (larghezzaModulo / 2), hCorrente - (spessore / 2), zCenterCassa, colorInt);
        creaPannello(wInterno, spessore, profondita, startX + (larghezzaModulo / 2), hZoccolo + (spessore / 2), zCenterCassa, colorInt);
        creaPannello(wInterno, hZoccolo, spessore, startX + (larghezzaModulo / 2), hZoccolo / 2, zCenterCassa + profondita/2 - 20, colorInt); // Zoccolo arretrato
        creaPannello(wInterno, hCorrente - (spessore * 2) - hZoccolo, spessoreSchienale, startX + (larghezzaModulo / 2), hZoccolo + spessore + ((hCorrente - (spessore * 2) - hZoccolo) / 2), zCenterSchienale, colorInt);

        // Ripiani e Cassetti
        if (numCassetti > 0) {
            const hRipiano = 8 + (numCassetti * passoCassetto);
            creaPannello(wInterno, spessore, profondita, startX + (larghezzaModulo / 2), hRipiano - (spessore / 2), zCenterCassa, colorInt);
        }

        // Reggiabiti
        if (checkboxReggiabiti && checkboxReggiabiti.checked) {
            const coloreReggiabiti = 0x999999;
            const wSostegno = 12, hSostegno = 63, dSostegno = 19, wSbarra = wInterno - 24, hSbarra = 30, dSbarra = 7;
            const ySostegno = hCorrente - spessore - (hSostegno / 2);
            creaPannello(wSostegno, hSostegno, dSostegno, startX + spessore + (wSostegno / 2), ySostegno, zCenterCassa, coloreReggiabiti);
            creaPannello(wSostegno, hSostegno, dSostegno, startX + larghezzaModulo - spessore - (wSostegno / 2), ySostegno, zCenterCassa, coloreReggiabiti);
            creaPannello(wSbarra, hSbarra, dSbarra, startX + (larghezzaModulo / 2), (hCorrente - spessore - hSostegno) + (hSbarra / 2), zCenterCassa, coloreReggiabiti);
        }

        // Frontali Cassetti (Le ante vengono gestite dopo)
        if (showAnte && numCassetti > 0) {
            const wFrontale = larghezzaModulo - aria;
            let yOccupata = 0;
            for (let j = 0; j < numCassetti; j++) {
                const hFrontale = passoCassetto - aria; 
                creaPannello(wFrontale, hFrontale, spessore, startX + (larghezzaModulo / 2), 8 + yOccupata + (hFrontale / 2), zCenterAnte, colorEst);
                yOccupata += passoCassetto; 
            }
        }
        startX += larghezzaModulo;
    }

    // --- TAMPONAMENTO SUPERIORE DEI MODULI (L Continua) ---
    if (moduliData.length > 0) {
        let endXModuli = startX;
        const ptsL = [];
        ptsL.push(new THREE.Vector2(0, moduliData[0].h));
        
        let cx = 0;
        for (let i = 0; i < moduliData.length; i++) {
            let nextX = cx + moduliData[i].w;
            let y = moduliData[i].h;
            if (i > 0) ptsL.push(new THREE.Vector2(cx, moduliData[i-1].h));
            ptsL.push(new THREE.Vector2(cx, y));
            ptsL.push(new THREE.Vector2(nextX, y));
            cx = nextX;
        }

        let topY = getSafeTopY(cx - 0.1);
        ptsL.push(new THREE.Vector2(cx, topY));
        
        if (cx > larghezzaUltimaPedata) {
            let j = Math.floor((cx - larghezzaUltimaPedata - 0.1) / pedataIn);
            let currRiserX = larghezzaUltimaPedata + j * pedataIn;
            while (currRiserX > 0.1) {
                ptsL.push(new THREE.Vector2(currRiserX, topY));
                topY = getSafeTopY(currRiserX - 0.1);
                ptsL.push(new THREE.Vector2(currRiserX, topY));
                j--;
                currRiserX = larghezzaUltimaPedata + j * pedataIn;
            }
        }
        ptsL.push(new THREE.Vector2(0, topY));

        const shapeL = new THREE.Shape(ptsL);
        const extrudeL = new THREE.ExtrudeGeometry(shapeL, { depth: spessore, bevelEnabled: false });
        const meshL = new THREE.Mesh(extrudeL, new THREE.MeshPhongMaterial({ color: colorInt }));
        meshL.name = "pezzoModello";
        meshL.position.set(0, 0, zStartAnteExtrude); 
        scene.add(meshL);
        const lineL = new THREE.LineSegments(new THREE.EdgesGeometry(extrudeL, 20), new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.2 }));
        lineL.name = "pezzoModello";
        lineL.position.set(0, 0, zStartAnteExtrude);
        scene.add(lineL);
    }

    // --- ANTE MODULI (Da sopra i cassetti fino in cima al modulo) ---
    if (showAnte) {
        let cxAnte = 0;
        for (let i = 0; i < moduliData.length; i++) {
            const mod = moduliData[i];
            const numCassetti = parseInt(document.getElementById(`cassetti-mod-${i}`)?.value) || 0;
            const yOccupata = (numCassetti > 0) ? (numCassetti * passoCassetto) : 0;
            const wFrontale = mod.w - aria;
            const hAnta = mod.h - 8 - yOccupata - aria/2;
            
            if (hAnta > 0) {
                creaPannello(wFrontale, hAnta, spessore, cxAnte + (mod.w / 2), 8 + yOccupata + (hAnta / 2), zCenterAnte, colorEst);
            }
            cxAnte += mod.w;
        }
    }

    // --- TAMPONAMENTO FINALE (IL "BUCO" RIMANENTE) ---
    const totalStairWidth = larghezzaUltimaPedata + (numeroPedate - 1) * pedataIn;
    if (showAnte && startX < totalStairWidth) {
        const xStartBuco = startX + aria/2;
        const xEndBuco = totalStairWidth - aria/2;
        if (xEndBuco > xStartBuco) {
            creaPannelloZigZag(xStartBuco, xEndBuco, 8, zStartAnteExtrude, spessore, colorEst);
        }
    }

    // --- COSTRUZIONE GRADINI E ALZATE (Incastro Geometrico Perfetto) ---
    const coloreScala = 0x966F33; 
    let currentXScala = 0;

    for (let k = 0; k < numeroPedate; k++) {
        let wStep = (k === 0) ? larghezzaUltimaPedata : pedataIn;
        let topYScala = (numeroPedate - k) * alzataIn;
        
        // La pedata si appoggia
        creaPannello(wStep, spessoreLegnoScala, larghezzaRampa, 
            currentXScala + wStep/2, 
            topYScala - spessoreLegnoScala/2, 
            larghezzaRampa/2, coloreScala);
        
        // L'alzata scende esattamente fino alla pedata successiva
        let hAlz = alzataIn - spessoreLegnoScala;
        let centerYAlz = topYScala - spessoreLegnoScala - hAlz/2; 
        
        creaPannello(spessoreLegnoScala, hAlz, larghezzaRampa, 
            currentXScala + wStep - spessoreLegnoScala/2, 
            centerYAlz, 
            larghezzaRampa/2, coloreScala);
        
        currentXScala += wStep;
    }

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
