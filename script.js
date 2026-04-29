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

// Listener per la selezione della pianta scala
document.getElementById('piantaScala')?.addEventListener('change', (e) => {
    const val = e.target.value;
    if(val === 'Rampa unica') {
        document.getElementById('grp-pedate-totali').style.display = 'block';
        document.getElementById('grp-pedate-1').style.display = 'none';
        document.getElementById('grp-pedate-2').style.display = 'none';
    } else {
        document.getElementById('grp-pedate-totali').style.display = 'none';
        document.getElementById('grp-pedate-1').style.display = 'block';
        document.getElementById('grp-pedate-2').style.display = 'block';
    }
    generaArmadio();
});

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

// Nuova funzione: Crea poligono per gradino a ventaglio
function creaPoligonoScala(pts, y, spessore, color) {
    const shape = new THREE.Shape();
    shape.moveTo(pts[0].x, -pts[0].z);
    for(let i=1; i<pts.length; i++) shape.lineTo(pts[i].x, -pts[i].z);
    shape.closePath();

    const geom = new THREE.ExtrudeGeometry(shape, { depth: spessore, bevelEnabled: false });
    const mat = new THREE.MeshPhongMaterial({color: color});
    const mesh = new THREE.Mesh(geom, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = y;
    mesh.name = "pezzoModello";
    scene.add(mesh);

    const edges = new THREE.EdgesGeometry(geom);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.2 }));
    line.rotation.x = -Math.PI / 2;
    line.position.y = y;
    line.name = "pezzoModello";
    scene.add(line);
}

// Nuova funzione: Crea pannello verticale (alzata chiusa) orientato liberamente tra due punti
function creaAlzataPunti(pA, pB, yBottom, yTop, spessore, color) {
    const dist = Math.hypot(pB.x - pA.x, pB.z - pA.z);
    const angle = Math.atan2(pB.z - pA.z, pB.x - pA.x);
    const altezza = yTop - yBottom;
    
    const geom = new THREE.BoxGeometry(dist, altezza, spessore);
    const mat = new THREE.MeshPhongMaterial({color: color});
    const mesh = new THREE.Mesh(geom, mat);
    
    mesh.position.set((pA.x + pB.x)/2, yBottom + altezza/2, (pA.z + pB.z)/2);
    mesh.rotation.y = -angle; 
    mesh.name = "pezzoModello";
    scene.add(mesh);
    
    const edges = new THREE.EdgesGeometry(geom);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.2 }));
    line.position.copy(mesh.position);
    line.rotation.y = mesh.rotation.y;
    line.name = "pezzoModello";
    scene.add(line);
}

function calcolaBottomStrutturaY(x, tipo, pIn, pUltimo, aIn, N2, Y_shift = 0) {
    const m = -aIn / pIn;
    const theta = Math.atan(aIn / pIn);
    const lineY = m * (x - pUltimo) + (N2 - 1) * aIn - 40.6 + Y_shift;
    const offsetBottom = (tipo === 'Cremagliera') ? (120 / Math.cos(theta)) : (15 / Math.cos(theta));
    return lineY - offsetBottom;
}

function creaFasciaStruttura(tipo, pIn, pUltimo, aIn, N2, spessoreFascia, color, tipoSbarco, Y_shift = 0) {
    const m = -aIn / pIn;
    const theta = Math.atan(aIn / pIn);
    
    const offsetBottom = (tipo === 'Cremagliera') ? (120 / Math.cos(theta)) : (15 / Math.cos(theta));
    const bottomY = (x) => m * (x - pUltimo) + (N2 - 1) * aIn - 40.6 + Y_shift - offsetBottom;

    const pts = [];
    const xEndTotal = pUltimo + (N2 - 1) * pIn + 40.6; 
    const maxY = (tipoSbarco === 'Sotto solaio') ? (N2 * aIn + aIn - 40.6 + Y_shift) : (N2 * aIn + Y_shift);
    const xFloorBottom = pUltimo + (40.6 + offsetBottom - (N2 - 1) * aIn - Y_shift) / m;

    if (tipo === 'Lineare') {
        const q_noses = -m * (pUltimo + 40.6) + N2 * aIn + Y_shift;
        const offsetTop = 20 / Math.cos(theta);
        const topY = (x) => m * x + q_noses + offsetTop;

        pts.push(new THREE.Vector2(0, Math.max(0, bottomY(0))));

        if (xFloorBottom > 0 && xFloorBottom < xEndTotal) {
            pts.push(new THREE.Vector2(xFloorBottom, 0));
            pts.push(new THREE.Vector2(xEndTotal, 0));
        } else {
            pts.push(new THREE.Vector2(xEndTotal, Math.max(0, bottomY(xEndTotal))));
        }
        
        const yTopEnd = topY(xEndTotal);
        pts.push(new THREE.Vector2(xEndTotal, Math.max(0, yTopEnd)));
        
        const xTopIntersect = (maxY - q_noses - offsetTop) / m;
        if (xTopIntersect > 0 && xTopIntersect < xEndTotal) {
            pts.push(new THREE.Vector2(xTopIntersect, maxY));
            pts.push(new THREE.Vector2(0, maxY));
        } else {
            pts.push(new THREE.Vector2(0, Math.min(maxY, topY(0))));
        }
    } else { // Cremagliera
        pts.push(new THREE.Vector2(0, Math.max(0, bottomY(0))));

        if (xFloorBottom > 0 && xFloorBottom < xEndTotal) {
            pts.push(new THREE.Vector2(xFloorBottom, 0));
            pts.push(new THREE.Vector2(xEndTotal, 0));
        } else {
            pts.push(new THREE.Vector2(xEndTotal, Math.max(0, bottomY(xEndTotal))));
        }
        
        pts.push(new THREE.Vector2(xEndTotal, Math.max(0, aIn + Y_shift)));
        
        for (let k = N2 - 1; k >= 0; k--) {
            let y_top = (N2 - k) * aIn + Y_shift;
            let x_riser_front = (k === 0) ? 40.6 : pUltimo + (k - 1) * pIn + 40.6;
            
            if (k > 0) {
                pts.push(new THREE.Vector2(x_riser_front, y_top));
                let y_next_top = (N2 - (k - 1)) * aIn + Y_shift;
                pts.push(new THREE.Vector2(x_riser_front, y_next_top));
            } else {
                pts.push(new THREE.Vector2(x_riser_front, y_top));
                if (tipoSbarco === 'Sotto solaio') {
                    pts.push(new THREE.Vector2(x_riser_front, maxY));
                    pts.push(new THREE.Vector2(0, maxY));
                } else {
                    pts.push(new THREE.Vector2(0, y_top));
                }
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

    const tipoStruttura = document.getElementById('tipoStruttura')?.value || 'Lineare';
    const pedataIn = parseFloat(document.getElementById('pedata')?.value) || 250;
    const pedataUltimo = parseFloat(document.getElementById('pedataUltimo')?.value) || 250;
    const alzataIn = parseFloat(document.getElementById('alzata')?.value) || 180;
    const tipoSbarco = document.getElementById('tipoSbarco')?.value || 'Pari solaio';
    const pianta = document.getElementById('piantaScala')?.value || 'Rampa unica';

    let N1 = 0, N2 = 0, N_turn = 0;
    
    if (pianta === 'Rampa unica') {
        N2 = parseInt(document.getElementById('numeroPedate')?.value) || 10;
    } else {
        N1 = parseInt(document.getElementById('pedateRampa1')?.value) || 3;
        N2 = parseInt(document.getElementById('pedateRampa2')?.value) || 7;
        N_turn = (pianta === 'Giro con 2 ventagli') ? 2 : 3;
    }

    const Y_shift = (pianta === 'Rampa unica') ? 0 : (N1 + N_turn) * alzataIn;
    
    let gradinoInizioInput = document.getElementById('gradinoInizio');
    let gradinoInizioIn = parseInt(gradinoInizioInput?.value) || 3;
    const maxGradinoInizio = Math.max(3, N2 - 1);
    
    if (gradinoInizioIn > maxGradinoInizio) {
        gradinoInizioIn = maxGradinoInizio;
        if(gradinoInizioInput) gradinoInizioInput.value = maxGradinoInizio;
    }
    if (gradinoInizioIn < 3) {
        gradinoInizioIn = 3;
        if(gradinoInizioInput) gradinoInizioInput.value = 3;
    }
    if(gradinoInizioInput) gradinoInizioInput.max = maxGradinoInizio;

    const colorInt = document.getElementById('coloreInterno')?.value || '#F0ECE1';
    const colorEst = document.getElementById('coloreEsterno')?.value || '#FFFFFF';
    const showAnte = document.getElementById('showAnte')?.checked ?? true;

    // L'armadio è costruito sotto la Rampa 2
    const W_tot_R2 = pedataUltimo + (N2 - 1) * pedataIn;
    const W_armadio = pedataUltimo + (N2 - gradinoInizioIn) * pedataIn;

    const numeroModuli = Math.max(1, Math.round((N2 - gradinoInizioIn + 1) / 2));
    const larghezzaModulo = (W_armadio - 60) / numeroModuli;
    
    const passoCassetto = 160; 
    const profondita = 600;
    const spessore = 19;
    const hZoccolo = 45;
    const spessoreSchienale = 5;
    const aria = 3;

    // Altezze dei moduli che salgono col tetto della Rampa 2 (incluso Y_shift)
    let altezzeModuli = [];
    for (let i = 0; i < numeroModuli; i++) {
        let xr = (i + 1) * larghezzaModulo;
        let diff = xr - pedataUltimo;
        let k = diff <= 0 ? 0 : Math.ceil(diff / pedataIn);
        let step_h = (N2 - k) * alzataIn - 40.6 + Y_shift;
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

        creaPannello(spessore, hCorrente, profondita, startX + (spessore / 2), hCorrente / 2, profondita / 2, colorInt);
        creaPannello(spessore, hCorrente, profondita, startX + larghezzaModulo - (spessore / 2), hCorrente / 2, profondita / 2, colorInt);
        creaPannello(wInterno, spessore, profondita, startX + (larghezzaModulo / 2), hCorrente - (spessore / 2), profondita / 2, colorInt);
        creaPannello(wInterno, spessore, profondita, startX + (larghezzaModulo / 2), hZoccolo + (spessore / 2), profondita / 2, colorInt);
        creaPannello(wInterno, hZoccolo, spessore, startX + (larghezzaModulo / 2), hZoccolo / 2, profondita - 5 - (spessore / 2), colorInt);
        
        const hSchienale = hCorrente - (spessore * 2) - hZoccolo;
        creaPannello(wInterno, hSchienale, spessoreSchienale, startX + (larghezzaModulo / 2), hZoccolo + spessore + (hSchienale / 2), 10 + (spessoreSchienale / 2), colorInt);

        if (numCassetti > 0) {
            const altezzaBaseRipiano = 8 + (numCassetti * passoCassetto);
            creaPannello(wInterno, spessore, profondita, startX + (larghezzaModulo / 2), altezzaBaseRipiano - (spessore / 2), profondita / 2, colorInt);
        }

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
            
            const yStrutturaLeft = calcolaBottomStrutturaY(xLeft, tipoStruttura, pedataIn, pedataUltimo, alzataIn, N2, Y_shift);
            const yStrutturaRight = calcolaBottomStrutturaY(xRight, tipoStruttura, pedataIn, pedataUltimo, alzataIn, N2, Y_shift);
            
            const hLeft = yStrutturaLeft - 20 - yStartAnta;
            const hRight = yStrutturaRight - 20 - yStartAnta;

            if (hLeft > 0 && hRight > 0) { 
                creaAntaSagomata(xLeft, yStartAnta, profondita + spessore / 2, wFrontale, hLeft, hRight, spessore, colorEst);
            }
        }
        startX += larghezzaModulo;
    }

    // --- TAMPONAMENTO TRIANGOLARE VUOTO ---
    if (showAnte && startX < W_tot_R2) {
        const xLeftBuco = startX + (aria / 2);
        const yStartBuco = 8;
        
        const hLeftBuco = calcolaBottomStrutturaY(xLeftBuco, tipoStruttura, pedataIn, pedataUltimo, alzataIn, N2, Y_shift) - 20 - yStartBuco;
        
        if (hLeftBuco > 0) {
            const m = -alzataIn / pedataIn;
            const theta = Math.atan(alzataIn / pedataIn);
            const offsetBottom = (tipoStruttura === 'Cremagliera') ? (120 / Math.cos(theta)) : (15 / Math.cos(theta));
            
            const xZero = pedataUltimo + (40.6 + offsetBottom + 20 + yStartBuco - (N2 - 1) * alzataIn - Y_shift) / m;
            const xRightBuco = Math.min(W_tot_R2, xZero);
            const wBuco = xRightBuco - xLeftBuco;
            
            if (wBuco > 0) {
                const hRightBuco = calcolaBottomStrutturaY(xRightBuco, tipoStruttura, pedataIn, pedataUltimo, alzataIn, N2, Y_shift) - 20 - yStartBuco;
                creaAntaSagomata(xLeftBuco, yStartBuco, profondita + spessore / 2, wBuco, hLeftBuco, Math.max(0, hRightBuco), spessore, colorEst);
            }
        }
    }

    // --- TAMPONAMENTO SUPERIORE CONTINUO ---
    const luceArmadio = startX; 
    
    function getSafeTopY(x) {
        if (x <= pedataUltimo - 5) return N2 * alzataIn - 40.6 - 5 + Y_shift;
        let diff = x + 5 - pedataUltimo;
        let k = Math.floor(diff / pedataIn) + 1;
        if (k > N2 - 1) k = N2 - 1;
        return (N2 - k) * alzataIn - 40.6 - 5 + Y_shift;
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
    for (let k = N2 - 1; k >= 1; k--) {
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

    // --- COSTRUZIONE FASCIA STRUTTURA LATERALE (Rampa 2) ---
    creaFasciaStruttura(tipoStruttura, pedataIn, pedataUltimo, alzataIn, N2, 8, colorEst, tipoSbarco, Y_shift);

    // --- COSTRUZIONE RAMPA 2 (Legno) ---
    const spessoreLegnoScala = 40.6;
    const coloreScala = 0x966F33; 
    
    for (let k = 0; k < N2; k++) {
        const quotaY = (N2 - k) * alzataIn - spessoreLegnoScala + Y_shift;
        const quotaX = (k === 0) ? 0 : pedataUltimo + (k - 1) * pedataIn;
        const wPedata = (k === 0) ? pedataUltimo + spessoreLegnoScala : pedataIn + spessoreLegnoScala;

        creaPannello(wPedata, spessoreLegnoScala, profondita, quotaX + wPedata/2, quotaY + spessoreLegnoScala/2, profondita/2, coloreScala);

        if (k < N2 - 1) {
            const hAlzata = alzataIn - spessoreLegnoScala;
            creaPannello(spessoreLegnoScala, hAlzata, profondita, quotaX + wPedata - spessoreLegnoScala/2, quotaY - hAlzata/2, profondita/2, coloreScala);
        }
    }

    const hAlzataBase = alzataIn - spessoreLegnoScala;
    const quotaXBase = pedataUltimo + (N2 - 1) * pedataIn;
    const yBaseAlzata = (pianta === 'Rampa unica') ? hAlzataBase/2 : Y_shift + hAlzataBase/2;
    creaPannello(spessoreLegnoScala, hAlzataBase, profondita, quotaXBase + spessoreLegnoScala/2, yBaseAlzata, profondita/2, coloreScala);

    if (tipoSbarco === 'Sotto solaio') {
        const hAlzataSbarco = alzataIn - spessoreLegnoScala;
        const yTopSbarco = N2 * alzataIn + Y_shift;
        creaPannello(spessoreLegnoScala, hAlzataSbarco, profondita, spessoreLegnoScala/2, yTopSbarco + hAlzataSbarco/2, profondita/2, coloreScala);
    }

    // --- COSTRUZIONE TURN E RAMPA 1 IN 3D ---
    if (pianta !== 'Rampa unica') {
        const p0 = {x: W_tot_R2, z: 560};
        const p1 = {x: W_tot_R2, z: 0};
        const p2 = {x: W_tot_R2 + 400, z: 0};
        const p3 = {x: W_tot_R2 + 600, z: 0};
        const p4 = {x: W_tot_R2 + 600, z: 200};
        const p5 = {x: W_tot_R2 + 600, z: 600};
        const p6 = {x: W_tot_R2 + 40, z: 600};
        const pivot = {x: W_tot_R2 + 40, z: 560};

        // Piantone centrale quadrato
        creaPannello(40, Y_shift, 40, W_tot_R2 + 20, Y_shift/2, 580, coloreScala);

        if (pianta === 'Giro con 3 ventagli') {
            // W1 (Top)
            creaPoligonoScala([p1, p2, pivot, p0], Y_shift - spessoreLegnoScala, spessoreLegnoScala, coloreScala);
            creaAlzataPunti(p2, pivot, Y_shift - alzataIn, Y_shift - spessoreLegnoScala, spessoreLegnoScala, coloreScala);
            // W2 (Middle)
            creaPoligonoScala([p2, p3, p4, pivot], Y_shift - alzataIn - spessoreLegnoScala, spessoreLegnoScala, coloreScala);
            creaAlzataPunti(p4, pivot, Y_shift - 2*alzataIn, Y_shift - alzataIn - spessoreLegnoScala, spessoreLegnoScala, coloreScala);
            // W3 (Bottom)
            creaPoligonoScala([p4, p5, p6, pivot], Y_shift - 2*alzataIn - spessoreLegnoScala, spessoreLegnoScala, coloreScala);
            creaAlzataPunti(p5, p6, Y_shift - 3*alzataIn, Y_shift - 2*alzataIn - spessoreLegnoScala, spessoreLegnoScala, coloreScala);
        } else {
            // W1 (Top)
            creaPoligonoScala([p1, p3, pivot, p0], Y_shift - spessoreLegnoScala, spessoreLegnoScala, coloreScala);
            creaAlzataPunti(p3, pivot, Y_shift - alzataIn, Y_shift - spessoreLegnoScala, spessoreLegnoScala, coloreScala);
            // W2 (Bottom)
            creaPoligonoScala([p3, p5, p6, pivot], Y_shift - alzataIn - spessoreLegnoScala, spessoreLegnoScala, coloreScala);
            creaAlzataPunti(p5, p6, Y_shift - 2*alzataIn, Y_shift - alzataIn - spessoreLegnoScala, spessoreLegnoScala, coloreScala);
        }

        // Costruzione Rampa 1 verso l'esterno (+Z)
        for (let j = 0; j < N1; j++) {
            const quotaY = (N1 - j) * alzataIn - spessoreLegnoScala;
            const quotaZ = 600 - spessoreLegnoScala/2 + j * pedataIn;
            const wPedata1 = pedataIn + spessoreLegnoScala;
            
            creaPannello(600, spessoreLegnoScala, wPedata1, W_tot_R2 + 300, quotaY + spessoreLegnoScala/2, quotaZ + wPedata1/2, coloreScala);
            
            if (j < N1 - 1) {
                const hAlz = alzataIn - spessoreLegnoScala;
                creaPannello(600, hAlz, spessoreLegnoScala, W_tot_R2 + 300, quotaY - hAlz/2, quotaZ + wPedata1 - spessoreLegnoScala/2, coloreScala);
            } else {
                const hAlz = alzataIn - spessoreLegnoScala;
                creaPannello(600, hAlz, spessoreLegnoScala, W_tot_R2 + 300, hAlz/2, quotaZ + wPedata1 - spessoreLegnoScala/2, coloreScala);
            }
        }
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
