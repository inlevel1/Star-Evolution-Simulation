const massRange = document.getElementById('massRange');
const timeRange = document.getElementById('timeRange');
const massVal = document.getElementById('massVal');
const timeVal = document.getElementById('timeVal');

const totalEnergyText = document.getElementById('totalEnergyText');
const massLossText = document.getElementById('massLossText');
const fusionEnergyText = document.getElementById('fusionEnergyText');
const gravEnergyText = document.getElementById('gravEnergyText');

const hFuelText = document.getElementById('hFuelText');
const heFuelText = document.getElementById('heFuelText');
const cFuelText = document.getElementById('cFuelText');
const hBar = document.getElementById('hBar');
const heBar = document.getElementById('heBar');
const cBar = document.getElementById('cBar');
const hStatus = document.getElementById('hStatus');
const heStatus = document.getElementById('heStatus');
const cStatus = document.getElementById('cStatus');

const starCanvas = document.getElementById('starCanvas');
const starCtx = starCanvas.getContext('2d');

let isPlaying = false;
let timer = null;

function resizeCanvas() {
    starCanvas.width = starCanvas.parentElement.clientWidth - 30;
    starCanvas.height = 220;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const profileCtx = document.getElementById('profileChart').getContext('2d');
const profileChart = new Chart(profileCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            { label: '내부 압력 P(r)', data: [], borderColor: '#ffc107', borderWidth: 3, pointRadius: 0, yAxisID: 'y' },
            { label: '내부 온도 T(r)', data: [], borderColor: '#ff6b6b', borderWidth: 3, pointRadius: 0, yAxisID: 'y1' }
        ]
    },
    options: {
        responsive: true,
        plugins: { legend: { labels: { color: '#f0f6fc', font: { size: 11 } } } },
        scales: {
            x: { title: { display: true, text: '중심(0.0)에서 표면(1.0)까지의 거리 비', color: '#f0f6fc', font: { size: 11, weight: 'bold' } }, ticks: { color: '#c9d1d9', font: { size: 10 } }, grid: { color: '#30363d' } },
            y: { type: 'linear', position: 'left', title: { display: true, text: '압력', color: '#ffc107', font: { size: 11 } }, ticks: { color: '#ffc107', font: { size: 10 } }, grid: { color: '#30363d' } },
            y1: { type: 'linear', position: 'right', title: { display: true, text: '온도', color: '#ff6b6b', font: { size: 11 } }, ticks: { color: '#ff6b6b', font: { size: 10 } }, grid: { drawOnChartArea: false } }
        }
    }
});

const hrCtx = document.getElementById('hrChart').getContext('2d');
const hrChart = new Chart(hrCtx, {
    type: 'scatter',
    data: {
        datasets: [
            { label: '진화 궤적 (Trajectory)', data: [], backgroundColor: '#58a6ff', pointRadius: 2, type: 'scatter' },
            { label: '현재 항성 위치 (Current)', data: [], backgroundColor: '#ffd700', borderColor: '#ffffff', borderWidth: 2, pointRadius: 8, pointStyle: 'circle', type: 'scatter' }
        ]
    },
    options: {
        responsive: true,
        plugins: { legend: { labels: { color: '#f0f6fc', font: { size: 11 } } } },
        scales: {
            x: { reverse: true, title: { display: true, text: '표면 온도 (K)', color: '#f0f6fc', font: { size: 11, weight: 'bold' } }, ticks: { color: '#c9d1d9', font: { size: 10 } }, grid: { color: '#30363d' } },
            y: { type: 'logarithmic', title: { display: true, text: '광도 (L☉)', color: '#f0f6fc', font: { size: 11, weight: 'bold' } }, ticks: { color: '#c9d1d9', font: { size: 10 } }, grid: { color: '#30363d' } }
        }
    }
});

function computeStellarModel(initMass, t) {
    let R_solar, L_solar, T_eff;
    let progress = Math.min(1.0, t / 100); 

    let h_fuel, he_fuel, c_fuel;
    let threshold = initMass >= 5.0 ? 0.75 : 0.8;
    let isMassive = initMass >= 8.0;
    let isNeutronStar = (isMassive && progress >= 0.98);

    let calcProgress = isNeutronStar ? 0.98 : progress;

    if (isMassive && progress >= 0.90 && progress < 0.98) {
        // [초신성 붕괴 과도기] 초거성에서 중성자별로 압축되는 동안 크기와 광도가 자연스럽게 수렴하도록 보간
        let collapseProgress = (progress - 0.90) / 0.08; // 0 ~ 1 사이 값
        let maxSupergiantR = 3.0 + Math.pow((0.90 - threshold) / (1 - threshold), 4) * 120.0;
        
        // 크기가 거대 상태에서 중성자별 크기로 부드럽게 쪼그라듦
        R_solar = maxSupergiantR * (1 - collapseProgress) + 0.02 * collapseProgress;
        L_solar = Math.pow(initMass, 3.8) * (10.0 * (1 - collapseProgress) + 0.05 * collapseProgress);
        T_eff = 3000 * (1 - collapseProgress) + 600000 * collapseProgress;
        h_fuel = 0; he_fuel = 0; c_fuel = 0;
    } else if (isNeutronStar) {
        R_solar = 0.02; 
        L_solar = 0.05;
        T_eff = 600000; 
        h_fuel = 0; he_fuel = 0; c_fuel = 0;
    } else if (initMass >= 5.0) {
        if (progress < threshold) {
            R_solar = 1.0 + progress * 2.0;
            L_solar = Math.pow(initMass, 3.8) * (1 + progress * 0.5);
            T_eff = 25000 - progress * 5000;
            h_fuel = Math.max(0, 100 - (progress / threshold) * 85);
            he_fuel = Math.min(100, (progress / threshold) * 70);
            c_fuel = 0;
        } else {
            let expFactor = Math.pow((progress - threshold) / (1 - threshold), 4);
            R_solar = 3.0 + expFactor * 120.0;
            L_solar = Math.pow(initMass, 3.8) * (1.5 + expFactor * 10.0);
            T_eff = Math.max(3000, 20000 - expFactor * 15000);
            h_fuel = 0;
            he_fuel = Math.max(0, 70 - ((progress - threshold) / (1 - threshold)) * 60);
            c_fuel = Math.min(100, ((progress - threshold) / (1 - threshold)) * 80);
        }
    } else {
        if (progress < threshold) {
            R_solar = 1.0 + progress * 0.6;
            L_solar = Math.pow(initMass, 4.0) * (1 + progress * 0.2);
            T_eff = 5780 - progress * 400;
            h_fuel = Math.max(0, 100 - (progress / threshold) * 90);
            he_fuel = Math.min(100, (progress / threshold) * 80);
            c_fuel = 0;
        } else {
            let expFactor = Math.pow((progress - threshold) / (1 - threshold), 3);
            R_solar = 1.6 + expFactor * 50.0;
            L_solar = Math.pow(initMass, 4.0) * (1.2 + expFactor * 80.0);
            T_eff = Math.max(3100, 5300 - expFactor * 2000);
            h_fuel = 0;
            he_fuel = Math.max(0, 20);
            c_fuel = Math.min(100, 80 + ((progress - threshold) / (1 - threshold)) * 20);
        }
    }
    
    let fusionMassLoss = calcProgress * initMass * 0.007; 
    let fusionEnergy = fusionMassLoss * 1.788 * Math.pow(initMass, 1.2);
    let totalMassLoss = isNeutronStar ? (initMass - 1.4) : fusionMassLoss;

    let isLateStage = calcProgress >= threshold;
    let lateProgress = isLateStage ? (calcProgress - threshold) / (1 - threshold) : 0;
    
    let gravEnergy = 0;
    if (isNeutronStar) {
        let maxLateProgress = (0.98 - threshold) / (1 - threshold);
        gravEnergy = Math.pow(maxLateProgress, 3) * initMass * 0.5 * Math.pow(initMass, 1.2) + (3.5 * initMass);
    } else if (isLateStage) {
        gravEnergy = Math.pow(lateProgress, 3) * initMass * 0.5 * Math.pow(initMass, 1.2);
    } else {
        gravEnergy = calcProgress * 0.02;
    }

    let totalCumulativeEnergy = fusionEnergy + gravEnergy;
    let currentMass = isNeutronStar ? 1.4 : (initMass - totalMassLoss);

    let shellRadii = [];
    let pressureProfile = [];
    let tempProfile = [];
    
    let coreContractionFactor = isNeutronStar ? 50000.0 : (1.0 + (isLateStage ? Math.pow(lateProgress, 3) * 6.0 : progress * 0.3));
    let P_center = 1.5e16 * Math.pow(initMass, 2) * coreContractionFactor;
    let T_center = 1.5e7 * Math.pow(initMass, 0.5) * Math.sqrt(coreContractionFactor);

    for (let i = 0; i <= 20; i++) {
        let r_ratio = i / 20;
        shellRadii.push(r_ratio.toFixed(2));
        let p_val = P_center * Math.pow(Math.max(0, 1 - r_ratio), 2.2);
        let t_val = T_center * Math.max(0.05, 1 - r_ratio * 0.95);
        pressureProfile.push(p_val / 1e12);
        tempProfile.push(t_val / 1e5);
    }

    return { 
        R: R_solar, L: L_solar, T: T_eff, M: currentMass, 
        radii: shellRadii, P: pressureProfile, Temp: tempProfile,
        fuelH: h_fuel, fuelHe: he_fuel, fuelC: c_fuel,
        massLoss: totalMassLoss, fusionEnergy: fusionEnergy, gravEnergy: gravEnergy,
        totalEnergy: totalCumulativeEnergy, isNeutronStar: isNeutronStar, progress: progress, threshold: threshold,
        isCollapsing: (isMassive && progress >= 0.90 && progress < 0.98)
    };
}

function getStarColor(temp, isNeutronStar, isCollapsing) {
    if (isNeutronStar) return '#00ffff';
    if (isCollapsing) return '#ffffff'; // 초신성 폭발/수축 과도기에는 눈부신 섬광(백색) 효과
    if (temp > 20000) return '#9bb0ff';
    if (temp > 10000) return '#bbccff';
    if (temp > 6000) return '#ffffed';
    if (temp > 4500) return '#ffeedd';
    return '#ff4444';
}

function drawStar(rad, temp, isNeutronStar, progress, threshold, isCollapsing) {
    starCtx.clearRect(0, 0, starCanvas.width, starCanvas.height);
    
    starCtx.save();
    
    let isTransitioning = (progress >= threshold && progress <= threshold + 0.05) || isNeutronStar || isCollapsing;
    if (isTransitioning) {
        let shakeIntensity = isNeutronStar || isCollapsing ? 8 : 3;
        let shakeX = (Math.random() - 0.5) * shakeIntensity;
        let shakeY = (Math.random() - 0.5) * shakeIntensity;
        starCtx.translate(shakeX, shakeY);
    }

    let cx = starCanvas.width / 2;
    let cy = starCanvas.height / 2;
    
    // 초고거성 상태일 때는 캔버스 크기에 맞춰 시각적 반지름 제한, 중성자별/수축기에는 알맞게 조절
    let maxVisualR = cy - 20;
    let displayR = isNeutronStar ? 5 : Math.min(rad * 2.5, maxVisualR);
    if (displayR < 4) displayR = 4;
    let color = getStarColor(temp, isNeutronStar, isCollapsing);

    let gradRadius = isNeutronStar ? 5.0 : (isCollapsing ? 3.0 : 1.4);
    let grad = starCtx.createRadialGradient(cx, cy, 0, cx, cy, displayR * gradRadius);
    grad.addColorStop(0, color);
    grad.addColorStop(0.6, color);
    grad.addColorStop(1, 'transparent');

    starCtx.beginPath();
    starCtx.arc(cx, cy, displayR * gradRadius, 0, Math.PI * 2);
    starCtx.fillStyle = grad;
    starCtx.fill();

    starCtx.beginPath();
    starCtx.arc(cx, cy, displayR, 0, Math.PI * 2);
    starCtx.fillStyle = color;
    starCtx.shadowBlur = isNeutronStar ? 35 : (isCollapsing ? 45 : 22);
    starCtx.shadowColor = color;
    starCtx.fill();
    starCtx.shadowBlur = 0;

    if (isNeutronStar) {
        starCtx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
        starCtx.lineWidth = 2;
        starCtx.beginPath();
        starCtx.arc(cx, cy, displayR + 12 + (Date.now() % 500) * 0.05, 0, Math.PI * 2);
        starCtx.stroke();
    }

    starCtx.restore();
}

function updateSimulation() {
    let initMass = parseFloat(massRange.value);
    let t = parseInt(timeRange.value);

    massVal.innerText = initMass.toFixed(1);
    timeVal.innerText = (t * 0.1).toFixed(1);

    let model = computeStellarModel(initMass, t);
    drawStar(model.R, model.T, model.isNeutronStar, model.progress, model.threshold, model.isCollapsing);

    massLossText.innerText = model.massLoss.toFixed(4);
    fusionEnergyText.innerText = model.fusionEnergy.toFixed(2);
    gravEnergyText.innerText = model.gravEnergy.toFixed(2);
    totalEnergyText.innerText = model.totalEnergy.toFixed(2);

    hFuelText.innerText = Math.round(model.fuelH);
    heFuelText.innerText = Math.round(model.fuelHe);
    cFuelText.innerText = Math.round(model.fuelC);

    hBar.style.width = model.fuelH + '%';
    heBar.style.width = model.fuelHe + '%';
    cBar.style.width = model.fuelC + '%';

    if (model.isNeutronStar) {
        hStatus.innerText = "초신성 폭발 완료";
        hStatus.className = "text-danger";
        heStatus.innerText = "소모 완료";
        heStatus.className = "text-danger";
        cStatus.innerText = "중성자별 잔해 형성";
        cStatus.className = "text-info";
    } else if (model.isCollapsing) {
        hStatus.innerText = "초신성 붕괴 중";
        hStatus.className = "text-warning";
        heStatus.innerText = "폭발 직전 압축";
        heStatus.className = "text-warning";
        cStatus.innerText = "중심핵 급속 수축";
        cStatus.className = "text-danger";
    } else if (model.fuelH > 0) {
        hStatus.innerText = "연소 중 (주계열)";
        hStatus.className = "text-success";
        heStatus.innerText = "대기/생성 중";
        heStatus.className = "text-muted";
    } else {
        hStatus.innerText = "소모 완료";
        hStatus.className = "text-danger";
        if (model.fuelHe > 0) {
            heStatus.innerText = "핵융합 연소 중";
            heStatus.className = "text-warning";
        } else {
            heStatus.innerText = "소모 완료";
            heStatus.className = "text-danger";
        }
        if (model.fuelC > 0) {
            cStatus.innerText = "핵융합 연소 중";
            cStatus.className = "text-danger";
        }
    }

    profileChart.data.labels = model.radii;
    profileChart.data.datasets[0].data = model.P;
    profileChart.data.datasets[1].data = model.Temp;
    profileChart.update();

    let hrPoints = [];
    for (let step = 0; step <= 100; step += 2) {
        let m = computeStellarModel(initMass, step);
        hrPoints.push({ x: m.T, y: m.L });
    }
    
    hrChart.data.datasets[0].data = hrPoints;
    hrChart.data.datasets[1].data = [{ x: model.T, y: model.L }];
    hrChart.update();
}

massRange.addEventListener('input', updateSimulation);
timeRange.addEventListener('input', updateSimulation);

document.getElementById('playBtn').addEventListener('click', () => {
    if (isPlaying) {
        clearInterval(timer);
        isPlaying = false;
        document.getElementById('playBtn').innerText = "재생";
    } else {
        isPlaying = true;
        document.getElementById('playBtn').innerText = "일시정지";
        timer = setInterval(() => {
            let val = parseInt(timeRange.value);
            if (val >= 150) {
                clearInterval(timer);
                isPlaying = false;
                document.getElementById('playBtn').innerText = "재생";
            } else {
                timeRange.value = val + 1;
                updateSimulation();
            }
        }, 80);
    }
});

document.getElementById('resetBtn').addEventListener('click', () => {
    if (isPlaying) { clearInterval(timer); isPlaying = false; document.getElementById('playBtn').innerText = "재생"; }
    timeRange.value = 0;
    massRange.value = 1.0;
    updateSimulation();
});

updateSimulation();