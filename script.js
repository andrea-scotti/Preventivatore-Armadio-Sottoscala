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

    // Lettura dei nuovi parametri
    const piantaScala = document.getElementById('piantaScala')?.value || 'Lineare';
    const tipoStruttura = document.getElementById('tipoStruttura').value;
    const pedataIn = parseFloat(document.getElementById('pedata').value) || 250;
    const alzataIn = parseFloat(document.getElementById('alzata').value) || 180;
    const larghezzaRampa = parseFloat(document.getElementById('larghezzaRampa').value) || 800;
    const numeroPedate = parseInt(document.getElementById('numeroPedate').value) || 10;
    const larghezzaUltimaPedata = parseFloat(document.getElementById('larghezzaUltimaPedata').value) || 250;
    
    const colorInt = document.getElementById('coloreInterno').value;
    const colorEst = document.getElementById('coloreEsterno').value;
    const showAnte = document.getElementById('showAnte').checked;

    const profondita = 600; // L'armadio rimane fisso a 600mm
    const spessore = 19;
    const hZoccolo = 45;
    const spessoreSchienale = 5;
    const aria = 3;
    const passoCassetto = 160;

    // --- FUNZIONE DI SUPPORTO: Calcolo del tetto massimo ---
    // Restituisce l'altezza Y esatta del limite sotto la scala (con aria 5mm) per un dato X
    function getSafeTopY(x) {
        if (x <= larghezzaUltimaPedata) return (numeroPedate * alzataIn) - 5;
        let diff = x - larghezzaUltimaPedata;
        let k = 1 + Math.floor((diff - 0.1) / pedataIn);
        if (k > numeroPedate - 1) k = numeroPedate - 1;
        return ((numeroPedate - k) * alzataIn) - 5;
    }

    // --- LOGICA MODULI ---
    const moduliData = [];
    
    // Modulo 1 (Sotto l'ultima pedata in alto a sinistra)
    const hSafeMod0 = getSafeTopY(larghezzaUltimaPedata) - 60; 
    moduliData.push({ w: larghezzaUltimaPedata, h: hSafeMod0 });

    // Moduli centrali (Sottraggo la pedata speciale e le 2 pedate vuote in fondo)
    const middleTreads = numeroPedate - 3; 
    if (middleTreads > 0) {
        const numMiddleModules = Math.ceil(middleTreads / 2); // 1 modulo ogni 2 gradini circa
        const wMid = (middleTreads * pedataIn) / numMiddleModules;
        let curX = larghezzaUltimaPedata;
        for (let i = 0; i < numMiddleModules; i++) {
            let endX = curX + wMid;
            moduliData.push({ w: wMid, h: getSafeTopY(endX) - 60 });
            curX += wMid;
        }
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
        creaPannello(spessore, hCorrente, profondita, startX + (spessore / 2), hCorrente / 2, profondita / 2, colorInt);
        creaPannello(spessore, hCorrente, profondita, startX + larghezzaModulo - (spessore / 2), hCorrente / 2, profondita / 2, colorInt);
        creaPannello(wInterno, spessore, profondita, startX + (larghezzaModulo / 2), hCorrente - (spessore / 2), profondita / 2, colorInt);
        creaPannello(wInterno, spessore, profondita, startX + (larghezzaModulo / 2), hZoccolo + (spessore / 2), profondita / 2, colorInt);
        creaPannello(wInterno, hZoccolo, spessore, startX + (larghezzaModulo / 2), hZoccolo / 2, profondita - 5 - (spessore / 2), colorInt);
        
        const hSchienale = hCorrente - (spessore * 2) - hZoccolo;
        creaPannello(wInterno, hSchienale, spessoreSchienale, startX + (larghezzaModulo / 2), hZoccolo + spessore + (hSchienale / 2), 10 + (spessoreSchienale / 2), colorInt);

        // Ripiani e Cassetti
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

        // Ante e Frontali
        if (showAnte) {
            const wFrontale = larghezzaModulo - aria;
            let yOccupataDaCassetti = 0;
            for (let j = 0; j < numCassetti; j++) {
                const hFrontaleCassetto = passoCassetto - aria; 
                const yPos = 8 + yOccupataDaCassetti + (hFrontaleCassetto / 2);
                creaPannello(wFrontale, hFrontaleCassetto, spessore, startX + (larghezzaModulo / 2), yPos, profondita + (spessore / 2), colorEst);
                yOccupataDaCassetti += passoCassetto; 
            }

            const xLeft = startX + (aria / 2);
            const yStartAnta = 8 + yOccupataDaCassetti;
            const hLeft = getSafeTopY(xLeft) - 20 - yStartAnta;
            const hRight = getSafeTopY(xLeft + wFrontale) - 20 - yStartAnta;

            if (hLeft > 0 && hRight > 0) { 
                creaAntaSagomata(xLeft, yStartAnta, profondita, wFrontale, hLeft, hRight, spessore, colorEst);
            }
        }
        startX += larghezzaModulo;
    }

    // --- ANTA DI CHIUSURA (Buco Finale per le prime due pedate in basso) ---
    const wBuco = 2 * pedataIn;
    if (showAnte) {
        const xLeftBuco = startX + aria/2;
        const wFrontaleBuco = wBuco - aria;
        const hLeftBuco = getSafeTopY(xLeftBuco) - 20;
        const hRightBuco = getSafeTopY(xLeftBuco + wFrontaleBuco) - 20;

        if (hLeftBuco > 0) {
            creaAntaSagomata(xLeftBuco, 8, profondita, wFrontaleBuco, hLeftBuco, hRightBuco, spessore, colorEst);
        }
    }
    const xEndTotal = startX + wBuco;

    // --- TAMPONAMENTO SUPERIORE (L Unica Continua) ---
    if (tipoStruttura === 'Lineare') {
        const pts = [];
        pts.push(new THREE.Vector2(0, moduliData[0].h));
        
        let cx = 0;
        for (let i = 0; i < moduliData.length; i++) {
            let x1 = cx;
            let x2 = cx + moduliData[i].w;
            let y = moduliData[i].h;
            if (i > 0) pts.push(new THREE.Vector2(x1, moduliData[i-1].h));
            pts.push(new THREE.Vector2(x1, y));
            pts.push(new THREE.Vector2(x2, y));
            cx += moduliData[i].w;
        }

        let changes = [];
        for (let k = numeroPedate - 2; k >= 1; k--) {
            let chX = larghezzaUltimaPedata + k * pedataIn - 5;
            if (chX < cx && chX > 0) changes.push(chX);
        }

        let last_top_y = getSafeTopY(cx);
        pts.push(new THREE.Vector2(cx, last_top_y));

        for (let i = 0; i < changes.length; i++) {
            let chX = changes[i];
            pts.push(new THREE.Vector2(chX, last_top_y));
            let new_y = getSafeTopY(chX - 0.1);
            pts.push(new THREE.Vector2(chX, new_y));
            last_top_y = new_y;
        }
        pts.push(new THREE.Vector2(0, last_top_y));

        const shape = new THREE.Shape(pts);
        const extrudeSettings = { depth: spessore, bevelEnabled: false };
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const material = new THREE.MeshPhongMaterial({ color: colorInt });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = "pezzoModello";
        mesh.position.set(0, 0, profondita - spessore); 
        scene.add(mesh);
        
        const edges = new THREE.EdgesGeometry(geometry, 20);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.2 }));
        line.name = "pezzoModello";
        line.position.set(0, 0, profondita - spessore);
        scene.add(line);
    }

    // --- COSTRUZIONE GRADINI E ALZATE (LARGHEZZA RAMPA) ---
    const spessoreLegnoScala = 40.6;
    const coloreScala = 0x966F33; 
    let currentXScala = 0;

    for (let k = 0; k < numeroPedate; k++) {
        let wStep = (k === 0) ? larghezzaUltimaPedata : pedataIn;
        let topYScala = (numeroPedate - k) * alzataIn;

        creaPannello(wStep + spessoreLegnoScala, spessoreLegnoScala, larghezzaRampa, currentXScala + wStep/2, topYScala + spessoreLegnoScala/2, larghezzaRampa/2, coloreScala);

        if (k < numeroPedate - 1) {
            let hAlz = alzataIn - spessoreLegnoScala;
            let centerYAlz = topYScala - hAlz/2;
            creaPannello(spessoreLegnoScala, hAlz, larghezzaRampa, currentXScala + wStep + spessoreLegnoScala/2, centerYAlz, larghezzaRampa/2, coloreScala);
        }
        currentXScala += wStep;
    }
    const hAlzataUltimaBase = alzataIn - spessoreLegnoScala;
    creaPannello(spessoreLegnoScala, hAlzataUltimaBase, larghezzaRampa, currentXScala + spessoreLegnoScala/2, hAlzataUltimaBase/2, larghezzaRampa/2, coloreScala);

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
