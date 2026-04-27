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

function calcolaBottomStrutturaY(x, tipo, pIn, pUltimo, aIn, N) {
    const m = -aIn / pIn;
    const theta = Math.atan(aIn / pIn);
    const lineY = m * (x - pUltimo) + (N - 1) * aIn;
    const offsetBottom = (tipo === 'Cremagliera') ? (120 / Math.cos(theta)) : (15 / Math.cos(theta));
    return lineY - offsetBottom;
}

function creaFasciaStruttura(tipo, pIn, pUltimo, aIn, N, spessoreFascia, color) {
    const m = -aIn / pIn;
    const theta = Math.atan(aIn / pIn);
    const lineY = (x) => m * (x - pUltimo) + (N - 1) * aIn;
    const offsetBottom = (tipo === 'Cremagliera') ? (120 / Math.cos(theta)) : (15 / Math.cos(theta));
    const bottomY = (x) => lineY(x) - offsetBottom;

    const pts = [];
    const x_start = 0;
    const xEndTotal = pUltimo + (N - 1) * pIn + 40.6; 
    const yTopStairs = N * aIn + 40.6; 

    if (tipo === 'Lineare') {
        const offsetTop = 20 / Math.cos(theta);
        const topY = (x) => lineY(x) + offsetTop;

        pts.push(new THREE.Vector2(0, bottomY(0)));
        pts.push(new THREE.Vector2(xEndTotal, bottomY(xEndTotal)));
        pts.push(new THREE.Vector2(xEndTotal, topY(xEndTotal)));
        
        const yTop0 = topY(0);
        if (yTop0 > yTopStairs) {
            const intersectX = (yTopStairs - ((N - 1) * aIn - m * pUltimo + offsetTop)) / m;
            pts.push(new THREE.Vector2(intersectX, yTopStairs));
            pts.push(new THREE.Vector2(0, yTopStairs));
        } else {
            pts.push(new THREE.Vector2(0, yTop0));
        }
    } else { // Cremagliera
        pts.push(new THREE.Vector2(x_start, bottomY(x_start)));
        pts.push(new THREE.Vector2(xEndTotal, bottomY(xEndTotal)));
        pts.push(new THREE.Vector2(xEndTotal, aIn + 40.6));
        
        for (let k = N - 1; k >= 0; k--) {
            let y_top = (N - k) * aIn + 40.6;
            let x_riser_front = (k === 0) ? 40.6 : pUltimo + (k - 1) * pIn + 40.6;
            
            if (k > 0) {
                pts.push(new THREE.Vector2(x_riser_front, y_top));
                let y_next_top = (N - (k - 1)) * aIn + 40.6;
                pts.push(new THREE.Vector2(x_riser_front, y_next_top));
            } else {
                pts.push(new THREE.Vector2(x_riser_front, y_top));
                pts.push(new THREE.Vector2(x_riser_front, yTopStairs));
                pts.push(new THREE.Vector2(x_start, yTopStairs));
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
    if(containerAcc) containerAcc.innerHTML = '';

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
        if(containerAcc) containerAcc.appendChild(div);

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

    // Lettura sicura dei valori (se un input manca non fa crashare tutto)
    const tipoStruttura = document.getElementById('tipoStruttura')?.value || 'Lineare';
    const pedataIn = parseFloat(document.getElementById('pedata')?.value) || 250;
    const pedataUltimo = parseFloat(document.getElementById('pedataUltimo')?.value) || 250;
    const alzataIn = parseFloat(document.getElementById('alzata')?.value) || 180;
    const gradinoInizioIn = parseInt(document.getElementById('gradinoInizio')?.value) || 3;
    const numeroPedate = parseInt(document.getElementById('numeroPedate')?.value) || 10;
    const tipoSbarco = document.getElementById('tipoSbarco')?.value || 'Pari solaio';

    const colorInt = document.getElementById('coloreInterno')?.value || '#F0ECE1';
    const colorEst = document.getElementById('coloreEsterno')?.value || '#FFFFFF';
    const showAnte = document.getElementById('showAnte')?.checked ?? true;

    // Calcolo dimensioni generali (Scala da terra)
    const W_tot = pedataUltimo + (numeroPedate - 1) * pedataIn;
    // L'armadio si ferma in corrispondenza del gradino di inizio
    const W_armadio = pedataUltimo + (numeroPedate - gradinoInizioIn) * pedataIn;

    // Numero di moduli in base allo spazio utile coperto dall'armadio
    const numeroModuli = Math.max(1, Math.round((numeroPedate - gradinoInizioIn + 1) / 2));
    const larghezzaModulo = (W_armadio - 60) / numeroModuli;
    
    const passoCassetto = 160; 
    const profondita = 600;
    const spessore = 19;
    const hZoccolo = 45;
    const spessoreSchienale = 5;
    const aria = 3;

    // Calcolo altezze corrette seguendo fedelmente la pendenza del tetto armadio
    let altezzeModuli = [];
    for (let i = 0; i < numeroModuli; i++) {
        let xr = (i + 1) * larghezzaModulo;
        let diff = xr - pedataUltimo;
        let k = diff <= 0 ? 0 : Math.ceil(diff / pedataIn);
        let step_h = (numeroPedate - k) * alzataIn;
        altezzeModuli.push(step_h - 60.6);
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

        // Struttura Armadio Base
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
            const wTamp = (i === 0) ? pedataUltimo - 20 : pedataIn - 20; 
            const hTamp = alzataIn;
            if (wTamp > 0 && hTamp > 0) {
                creaPannello(wTamp, hTamp, spessore, startX + (wTamp / 2), hCorrente + (hTamp / 2), profondita - (spessore / 2), colorInt);
            }
        }

        // Ripiano Interno Cassetti
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
            
            const yStrutturaLeft = calcolaBottomStrutturaY(xLeft, tipoStruttura, pedataIn, pedataUltimo, alzataIn, numeroPedate);
            const yStrutturaRight = calcolaBottomStrutturaY(xRight, tipoStruttura, pedataIn, pedataUltimo, alzataIn, numeroPedate);
            
            const hLeft = yStrutturaLeft - 20 - yStartAnta;
            const hRight = yStrutturaRight - 20 - yStartAnta;

            if (hLeft > 0 && hRight > 0) { 
                creaAntaSagomata(xLeft, yStartAnta, profondita + spessore / 2, wFrontale, hLeft, hRight, spessore, colorEst);
            }
        }
        startX += larghezzaModulo;
    }

    // --- TAMPONAMENTO TRIANGOLARE VUOTO (A FILO ANTE) ---
    // Copre esattamente lo spazio tra la fine dell'ultimo modulo e la base finale della scala
    if (showAnte && startX < W_tot) {
        const xLeftBuco = startX + (aria / 2);
        const wBuco = W_tot - xLeftBuco;
        const yStartBuco = 8;
        
        const hLeftBuco = calcolaBottomStrutturaY(xLeftBuco, tipoStruttura, pedataIn, pedataUltimo, alzataIn, numeroPedate) - 20 - yStartBuco;
        const hRightBuco = calcolaBottomStrutturaY(W_tot, tipoStruttura, pedataIn, pedataUltimo, alzataIn, numeroPedate) - 20 - yStartBuco;

        if (wBuco > 0 && hLeftBuco > 0) {
            creaAntaSagomata(xLeftBuco, yStartBuco, profondita + spessore / 2, wBuco, hLeftBuco, Math.max(0, hRightBuco), spessore, colorEst);
        }
    }

    // --- TAMPONAMENTO LINEARE SUPERIORE CONTINUO ---
    if (tipoStruttura === 'Lineare') {
        const luceArmadio = startX; 
        
        function getSafeTopY(x) {
            if (x <= pedataUltimo - 5) return numeroPedate * alzataIn - 5;
            let diff = x + 5 - pedataUltimo;
            let k = Math.floor(diff / pedataIn) + 1;
            if (k > numeroPedate - 1) k = numeroPedate - 1;
            return (numeroPedate - k) * alzataIn - 5;
        }

        const pts = [];
        pts.push(new THREE.Vector2(0, altezzeModuli[0]));
        
        for (let i = 0; i < numeroModuli; i++) {
            let x1 = i * larghezzaModulo;
            let x2 = (i + 1) * larghezzaModulo;
            let y = altezzeModuli[i];
            if (i > 0) pts.push(new THREE.Vector2(x1, altezzeModuli[i - 1]));
            pts.push(new THREE.Vector2(x1, y));
            pts.push(new THREE.Vector2(x2, y));
        }

        let changes = [];
        for (let k = numeroPedate - 1; k >= 1; k--) {
            let cx = pedataUltimo + (k - 1) * pedataIn - 5; 
            if (cx < luceArmadio && cx > 0) changes.push(cx);
        }

        let last_top_y = getSafeTopY(luceArmadio);
        pts.push(new THREE.Vector2(luceArmadio, last_top_y));

        for (let i = 0; i < changes.length; i++) {
            let cx = changes[i];
            pts.push(new THREE.Vector2(cx, last_top_y));
            let new_y = getSafeTopY(cx - 0.1);
            pts.push(new THREE.Vector2(cx, new_y));
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

    // --- COSTRUZIONE FASCIA STRUTTURA LATERALE ---
    creaFasciaStruttura(tipoStruttura, pedataIn, pedataUltimo, alzataIn, numeroPedate, 8, colorEst);

    // --- COSTRUZIONE GRADINI E ALZATE IN LEGNO ---
    const spessoreLegnoScala = 40.6;
    const coloreScala = 0x966F33; 
    
    for (let k = 0; k < numeroPedate; k++) {
        const quotaY = (numeroPedate - k) * alzataIn;
        const quotaX = (k === 0) ? 0 : pedataUltimo + (k - 1) * pedataIn;
        const wPedata = (k === 0) ? pedataUltimo + spessoreLegnoScala : pedataIn + spessoreLegnoScala;

        creaPannello(wPedata, spessoreLegnoScala, profondita, quotaX + wPedata/2, quotaY + spessoreLegnoScala/2, profondita/2, coloreScala);

        if (k < numeroPedate - 1) {
            const hAlzata = alzataIn - spessoreLegnoScala;
            const centerXYAlzata = quotaY - hAlzata/2;
            creaPannello(spessoreLegnoScala, hAlzata, profondita, quotaX + wPedata - spessoreLegnoScala/2, centerXYAlzata, profondita/2, coloreScala);
        }
    }

    // Ultima alzata a contatto con il pavimento
    const hAlzataBase = alzataIn - spessoreLegnoScala;
    const quotaXBase = pedataUltimo + (numeroPedate - 1) * pedataIn;
    creaPannello(spessoreLegnoScala, hAlzataBase, profondita, quotaXBase + spessoreLegnoScala/2, hAlzataBase/2, profondita/2, coloreScala);

    // Gestione Tipo Sbarco (Alzata aggiuntiva in cima)
    if (tipoSbarco === 'Sotto solaio') {
        const hAlzataSbarco = alzataIn - spessoreLegnoScala;
        const yTopSbarco = numeroPedate * alzataIn + spessoreLegnoScala;
        creaPannello(spessoreLegnoScala, hAlzataSbarco, profondita, spessoreLegnoScala/2, yTopSbarco + hAlzataSbarco/2, profondita/2, coloreScala);
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
