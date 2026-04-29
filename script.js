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

// Funzione migliorata: Calcola la normale per spingere l'alzata esattamente a filo dello scalino superiore
function creaAlzataPunti(pA, pB, yBottom, yTop, spessore, color) {
    const dist = Math.hypot(pB.x - pA.x, pB.z - pA.z);
    const angle = Math.atan2(pB.z - pA.z, pB.x - pA.x);
    const altezza = yTop - yBottom;
    
    const geom = new THREE.BoxGeometry(dist, altezza, spessore);
    const mat = new THREE.MeshPhongMaterial({color: color});
    const mesh = new THREE.Mesh(geom, mat);
    
    // Calcolo del Vettore Normale (per spingere l'alzata sotto il gradino ed evitare sbavature esterne)
    let nx = -(pB.z - pA.z) / dist;
    let nz = (pB.x - pA.x) / dist;
    
    let centerX = (pA.x + pB.x)/2 + (nx * spessore / 2);
    let centerZ = (pA.z + pB.z)/2 + (nz * spessore / 2);
    
    mesh.position.set(centerX, yBottom + altezza/2, centerZ);
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

// Nuova funzione: Crea pannelli strutturali liberi in 3D (utilizzata per i giri e per Rampa 1)
function creaPannelloSagomato(pts, spessore, color, pos, rotY) {
    if(pts.length === 0) return;
    const shape = new THREE.Shape();
    shape.moveTo(pts[0].x, pts[0].y);
    for(let i=1; i<pts.length; i++) shape.lineTo(pts[i].x, pts[i].y);
    shape.closePath();
    
    const geom = new THREE.ExtrudeGeometry(shape, { depth: spessore, bevelEnabled: false });
    const mat = new THREE.MeshPhongMaterial({color: color});
    const mesh = new THREE.Mesh(geom, mat);
    
    mesh.position.copy(pos);
    mesh.rotation.y = rotY;
    mesh.name = "pezzoModello";
    scene.add(mesh);
    
    const edges = new THREE.EdgesGeometry(geom, 20);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.2 }));
    line.position.copy(pos);
    line.rotation.y = rotY;
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
    } else { 
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
    
    if (gradinoInizioIn > maxGradinoInizio) gradinoInizioIn = maxGradinoInizio;
    if (gradinoInizioIn < 3) gradinoInizioIn = 3;
    if(gradinoInizioInput) gradinoInizioInput.max = maxGradinoInizio;

    const colorInt = document.getElementById('coloreInterno')?.value || '#F0ECE1';
    const colorEst = document.getElementById('coloreEsterno')?.value || '#FFFFFF';
    const showAnte = document.getElementById('showAnte')?.checked ?? true;

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

    const luceArmadio = startX; 
    function getSafeTopY(x) {
        if (x <= pedataUltimo - 5) return N2 * alzataIn - 40.6 - 5 + Y_shift;
        let diff = x + 5 - pedataUltimo;
        let k = Math.floor(diff / pedataIn) + 1;
        if (k > N2 - 1) k = N2 - 1;
        return (N2 - k) * alzataIn - 40.6 - 5 + Y_shift;
    }

    const ptsL = [];
    ptsL.push(new THREE.Vector2(0, altezzeModuli[0]));
    
    for (let i = 0; i < numeroModuli; i++) {
        let x1 = i * larghezzaModulo;
        let x2 = (i + 1) * larghezzaModulo;
        let y = altezzeModuli[i];
        if (i > 0) ptsL.push(new THREE.Vector2(x1, altezzeModuli[i - 1]));
        ptsL.push(new THREE.Vector2(x1, y));
        ptsL.push(new THREE.Vector2(x2, y));
    }

    let changes = [];
    for (let k = N2 - 1; k >= 1; k--) {
        let cx = pedataUltimo + (k - 1) * pedataIn - 5; 
        if (cx < luceArmadio && cx > 0) changes.push(cx);
    }

    let last_top_y = getSafeTopY(luceArmadio);
    ptsL.push(new THREE.Vector2(luceArmadio, last_top_y));

    for (let i = 0; i < changes.length; i++) {
        let cx = changes[i];
        ptsL.push(new THREE.Vector2(cx, last_top_y));
        let new_y = getSafeTopY(cx - 0.1);
        ptsL.push(new THREE.Vector2(cx, new_y));
        last_top_y = new_y;
    }
    ptsL.push(new THREE.Vector2(0, last_top_y));

    const shapeL = new THREE.Shape(ptsL);
    const extrudeSettings = { depth: spessore, bevelEnabled: false };
    const geometryL = new THREE.ExtrudeGeometry(shapeL, extrudeSettings);
    const materialL = new THREE.MeshPhongMaterial({ color: colorInt });
    
    const meshL = new THREE.Mesh(geometryL, materialL);
    meshL.name = "pezzoModello";
    meshL.position.set(0, 0, profondita - spessore); 
    scene.add(meshL);
    
    const edgesL = new THREE.EdgesGeometry(geometryL, 20); 
    const lineL = new THREE.LineSegments(edgesL, new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.2 }));
    lineL.name = "pezzoModello";
    lineL.position.set(0, 0, profondita - spessore);
    scene.add(lineL);

    // --- STRUTTURA LATERALE RAMPA 2 ---
    creaFasciaStruttura(tipoStruttura, pedataIn, pedataUltimo, alzataIn, N2, 8, colorEst, tipoSbarco, Y_shift);

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

    // --- STRUTTURE PER GIRO E RAMPA 1 IN 3D ---
    if (pianta !== 'Rampa unica') {
        const p0 = {x: W_tot_R2, z: 560};
        const p1 = {x: W_tot_R2, z: 0};
        const p2 = {x: W_tot_R2 + 400, z: 0};
        const p3 = {x: W_tot_R2 + 600, z: 0};
        const p4 = {x: W_tot_R2 + 600, z: 200};
        const p5 = {x: W_tot_R2 + 600, z: 600};
        const p6 = {x: W_tot_R2 + 40, z: 600};
        const pivot = {x: W_tot_R2 + 40, z: 560};

        // Piantone centrale
        creaPannello(40, Y_shift, 40, W_tot_R2 + 20, Y_shift/2, 580, coloreScala);

        if (pianta === 'Giro con 3 ventagli') {
            creaPoligonoScala([p1, p2, pivot, p0], Y_shift - spessoreLegnoScala, spessoreLegnoScala, coloreScala);
            creaAlzataPunti(p2, pivot, Y_shift - alzataIn, Y_shift - spessoreLegnoScala, spessoreLegnoScala, coloreScala);
            
            creaPoligonoScala([p2, p3, p4, pivot], Y_shift - alzataIn - spessoreLegnoScala, spessoreLegnoScala, coloreScala);
            creaAlzataPunti(p4, pivot, Y_shift - 2*alzataIn, Y_shift - alzataIn - spessoreLegnoScala, spessoreLegnoScala, coloreScala);
            
            creaPoligonoScala([p4, p5, p6, pivot], Y_shift - 2*alzataIn - spessoreLegnoScala, spessoreLegnoScala, coloreScala);
            creaAlzataPunti(p5, p6, Y_shift - 3*alzataIn, Y_shift - 2*alzataIn - spessoreLegnoScala, spessoreLegnoScala, coloreScala);
        } else {
            creaPoligonoScala([p1, p3, pivot, p0], Y_shift - spessoreLegnoScala, spessoreLegnoScala, coloreScala);
            creaAlzataPunti(p3, pivot, Y_shift - alzataIn, Y_shift - spessoreLegnoScala, spessoreLegnoScala, coloreScala);
            
            creaPoligonoScala([p3, p5, p6, pivot], Y_shift - alzataIn - spessoreLegnoScala, spessoreLegnoScala, coloreScala);
            creaAlzataPunti(p5, p6, Y_shift - 2*alzataIn, Y_shift - alzataIn - spessoreLegnoScala, spessoreLegnoScala, coloreScala);
        }

        // COSTRUZIONE FASCE STRUTTURALI (Giro + Rampa 1)
        const m = -alzataIn / pedataIn;
        const theta = Math.atan(alzataIn / pedataIn);
        const offsetTop = 20 / Math.cos(theta);
        
        // Pannello A (Muro Posteriore Giro)
        let ptsA = [];
        let lenA = 608 - 40.6;
        let bottomY_start_A = calcolaBottomStrutturaY(W_tot_R2 + 40.6, tipoStruttura, pedataIn, pedataUltimo, alzataIn, N2, Y_shift);
        let bottomY_end_A = bottomY_start_A + m * lenA;
        ptsA.push({x: 0, y: Math.max(0, bottomY_start_A)});
        ptsA.push({x: lenA, y: Math.max(0, bottomY_end_A)});
        
        let topY_start_A, topY_end_A;
        if (tipoStruttura === 'Lineare') {
            const q_noses = -m * (pedataUltimo + 40.6) + N2 * alzataIn + Y_shift;
            topY_start_A = m * (W_tot_R2 + 40.6) + q_noses + offsetTop;
            topY_end_A = topY_start_A + m * lenA;
            ptsA.push({x: lenA, y: topY_end_A});
            ptsA.push({x: 0, y: topY_start_A});
        } else {
            topY_start_A = Y_shift;
            topY_end_A = Y_shift;
            ptsA.push({x: lenA, y: Y_shift});
            ptsA.push({x: 0, y: Y_shift});
        }
        creaPannelloSagomato(ptsA, 8, colorEst, new THREE.Vector3(W_tot_R2 + 40.6, 0, -8), 0);

        // Pannello B (Muro Laterale Giro)
        let ptsB = [];
        let endY_B = bottomY_end_A + m * 600;
        ptsB.push({x: 0, y: Math.max(0, bottomY_end_A)});
        ptsB.push({x: 600, y: Math.max(0, endY_B)});
        
        let topY_end_B;
        if (tipoStruttura === 'Lineare') {
            topY_end_B = topY_end_A + m * 600;
            ptsB.push({x: 600, y: topY_end_B});
            ptsB.push({x: 0, y: topY_end_A});
        } else {
            if (pianta === 'Giro con 3 ventagli') {
                ptsB.push({x: 600, y: Y_shift - 2*alzataIn});
                ptsB.push({x: 200, y: Y_shift - 2*alzataIn});
                ptsB.push({x: 200, y: Y_shift - alzataIn});
                ptsB.push({x: 0, y: Y_shift - alzataIn});
                topY_end_B = Y_shift - 2*alzataIn;
            } else {
                ptsB.push({x: 600, y: Y_shift - alzataIn});
                ptsB.push({x: 0, y: Y_shift - alzataIn});
                topY_end_B = Y_shift - alzataIn;
            }
        }
        creaPannelloSagomato(ptsB, 8, colorEst, new THREE.Vector3(W_tot_R2 + 608, 0, 0), -Math.PI/2);

        // Fascia Esterna DX Rampa 1
        let ptsR1 = [];
        let xEndTotal_R1 = N1 * pedataIn + 40.6;
        let bottomY_end_R1 = endY_B + m * xEndTotal_R1;
        ptsR1.push({x: 0, y: Math.max(0, endY_B)});
        
        if (bottomY_end_R1 < 0) {
            ptsR1.push({x: -endY_B / m, y: 0});
            ptsR1.push({x: xEndTotal_R1, y: 0});
        } else {
            ptsR1.push({x: xEndTotal_R1, y: bottomY_end_R1});
        }
        
        if (tipoStruttura === 'Lineare') {
            ptsR1.push({x: xEndTotal_R1, y: Math.max(0, topY_end_B + m * xEndTotal_R1)});
            ptsR1.push({x: 0, y: topY_end_B});
        } else {
            ptsR1.push({x: xEndTotal_R1, y: Math.max(0, alzataIn)});
            for (let k = N1 - 1; k >= 0; k--) {
                let y_top = (N1 - k) * alzataIn;
                let x_r_front = (k === 0) ? 40.6 : (k - 1) * pedataIn + 40.6 + pedataIn;
                if (k > 0) {
                    ptsR1.push({x: x_r_front, y: y_top});
                    ptsR1.push({x: x_r_front, y: (N1 - (k - 1)) * alzataIn});
                } else {
                    ptsR1.push({x: x_r_front, y: y_top});
                    ptsR1.push({x: 0, y: y_top});
                }
            }
        }
        creaPannelloSagomato(ptsR1, 8, colorEst, new THREE.Vector3(W_tot_R2 + 608, 0, 600), -Math.PI/2);

        // Fascia Interna SX Rampa 1
        let ptsR1_in = [];
        let startY_in = calcolaBottomStrutturaY(W_tot_R2, tipoStruttura, pedataIn, pedataUltimo, alzataIn, N2, Y_shift);
        let bottomY_end_R1_in = startY_in + m * xEndTotal_R1;
        ptsR1_in.push({x: 0, y: Math.max(0, startY_in)});
        
        if (bottomY_end_R1_in < 0) {
            ptsR1_in.push({x: -startY_in / m, y: 0});
            ptsR1_in.push({x: xEndTotal_R1, y: 0});
        } else {
            ptsR1_in.push({x: xEndTotal_R1, y: bottomY_end_R1_in});
        }
        
        if (tipoStruttura === 'Lineare') {
            const q_noses = -m * (pedataUltimo + 40.6) + N2 * alzataIn + Y_shift;
            let topY_in = m * W_tot_R2 + q_noses + offsetTop;
            ptsR1_in.push({x: xEndTotal_R1, y: Math.max(0, topY_in + m * xEndTotal_R1)});
            ptsR1_in.push({x: 0, y: topY_in});
        } else {
            ptsR1_in.push({x: xEndTotal_R1, y: Math.max(0, alzataIn)});
            for (let k = N1 - 1; k >= 0; k--) {
                let y_top = (N1 - k) * alzataIn;
                let x_r_front = (k === 0) ? 40.6 : (k - 1) * pedataIn + 40.6 + pedataIn;
                if (k > 0) {
                    ptsR1_in.push({x: x_r_front, y: y_top});
                    ptsR1_in.push({x: x_r_front, y: (N1 - (k - 1)) * alzataIn});
                } else {
                    ptsR1_in.push({x: x_r_front, y: y_top});
                    ptsR1_in.push({x: 0, y: y_top});
                }
            }
        }
        creaPannelloSagomato(ptsR1_in, 8, colorEst, new THREE.Vector3(W_tot_R2, 0, 600), -Math.PI/2);

        // Gradini Rampa 1 in legno
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
