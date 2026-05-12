document.addEventListener('DOMContentLoaded', () => {
    const planchette = document.getElementById('planchette');
    const container = document.getElementById('board-container');
    const autoBtn = document.getElementById('auto-btn');
    const resetBtn = document.getElementById('reset-btn');
    const msgDisplay = document.getElementById('message-display');
    const svgBoard = document.getElementById('ouija-board');

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;
    let autoMode = false;
    let activeMoveTimeout = null;

    // Reset Planchette to center gracefully
    const initPos = () => {
        const rect = container.getBoundingClientRect();
        planchette.classList.add('auto-move');
        planchette.style.left = `${rect.width / 2}px`;
        planchette.style.top = `${rect.height / 2 + 80}px`;
        planchette.style.transform = `translate(-50%, -50%) rotate(0deg)`;
        
        setTimeout(() => {
            if(!autoMode) {
                planchette.classList.remove('auto-move');
            }
        }, 800);
        
        msgDisplay.textContent = "";
    };

    setTimeout(initPos, 200);

    // Grab Planchette
    const onPointerDown = (e) => {
        if(autoMode) return;
        isDragging = true;
        planchette.style.transition = 'none'; // remove transition for smooth dragging
        
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        
        startX = clientX;
        startY = clientY;
        
        initialLeft = parseFloat(planchette.style.left) || container.clientWidth / 2;
        initialTop = parseFloat(planchette.style.top) || container.clientHeight / 2;

        e.preventDefault();
    };

    // Drag Planchette
    const onPointerMove = (e) => {
        if (!isDragging) return;
        
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        
        const dx = clientX - startX;
        const dy = clientY - startY;
        
        let newLeft = initialLeft + dx;
        let newTop = initialTop + dy;
        
        const pRect = planchette.getBoundingClientRect();
        const cRect = container.getBoundingClientRect();
        
        // Boundaries
        if(newLeft < pRect.width/2) newLeft = pRect.width/2;
        if(newLeft > cRect.width - pRect.width/2) newLeft = cRect.width - pRect.width/2;
        if(newTop < pRect.height/2) newTop = pRect.height/2;
        if(newTop > cRect.height - pRect.height/2) newTop = cRect.height - pRect.height/2;
        
        // Rotational effect based on lateral motion
        const rotation = (dx * 0.05);
        
        planchette.style.left = `${newLeft}px`;
        planchette.style.top = `${newTop}px`;
        planchette.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
    };

    // Release Planchette
    const onPointerUp = () => {
        if(isDragging) {
            isDragging = false;
            planchette.style.transition = 'transform 0.4s ease-out';
            planchette.style.transform = `translate(-50%, -50%) rotate(0deg)`;
        }
    };

    planchette.addEventListener('mousedown', onPointerDown);
    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('mouseup', onPointerUp);

    planchette.addEventListener('touchstart', onPointerDown, {passive: false});
    document.addEventListener('touchmove', onPointerMove, {passive: false});
    document.addEventListener('touchend', onPointerUp);

    // Mathematical Mapping of Letters to inner SVG viewBox (1000x650)
    const targets = {
        'YES': {x: 220, y: 160},
        'NO': {x: 780, y: 160},
        'GOODBYE': {x: 500, y: 580}
    };
    
    // Function to calculate exact point on an SVG path safely
    const getPathPoint = (pathId, percentage) => {
        const path = document.getElementById(pathId);
        if(!path) return {x:0, y:0};
        const length = path.getTotalLength();
        return path.getPointAtLength(length * percentage);
    };

    // A-N Mapping (14 characters, center 50%) -> roughly 15% to 85% of path
    const amArr = "ABCDEFGHIJKLMN".split("");
    amArr.forEach((c, i) => {
        let pct = 0.22 + (0.56 / 13) * i; 
        let pt = getPathPoint('curveAM', pct);
        targets[c] = {x: pt.x, y: pt.y - 15}; // Offset slightly so hole aligns with center
    });

    // O-Z Mapping
    const nzArr = "OPQRSTUVWXYZ".split("");
    nzArr.forEach((c, i) => {
        let pct = 0.18 + (0.64 / 11) * i;
        let pt = getPathPoint('curveNZ', pct);
        targets[c] = {x: pt.x, y: pt.y - 15};
    });
    
    // Numbers Mapping
    const numArr = "1234567890".split("");
    numArr.forEach((c, i) => {
        // Line10 is completely horizontal (X from 150 to 850). 
        // Text is rendered fully centered, so it occupies approximately X = 250 to 750 depending on spacing.
        // Direct positional calculation is more robust than getPathPoint here since we lengthened the path bounds.
        let pct = 0.25 + (0.50 / 9) * i; 
        let pt = getPathPoint('line10', pct);
        targets[c] = {x: pt.x, y: pt.y - 15};
    });

    // Animate Planchette to Target
    const moveToTarget = (svgX, svgY) => {
        const svgRect = svgBoard.getBoundingClientRect();
        // Container rect needed because planchette absolute positioning is relative to container
        const contRect = container.getBoundingClientRect();
        
        const scaleX = svgRect.width / 1000;
        const scaleY = svgRect.height / 650;
        
        let targetX = (svgRect.left - contRect.left) + svgX * scaleX;
        let targetY = (svgRect.top - contRect.top) + svgY * scaleY;

        planchette.classList.add('auto-move');
        
        // Random organic offset
        targetX += (Math.random() - 0.5) * 8;
        targetY += (Math.random() - 0.5) * 8;
        let rotation = (Math.random() - 0.5) * 15;

        planchette.style.left = `${targetX}px`;
        planchette.style.top = `${targetY}px`;
        planchette.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
    };

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    // Spelling Routine
    const spellMessage = async (msg) => {
        autoMode = true;
        msgDisplay.textContent = "";
        const words = msg.toUpperCase().split(' ');
        
        for (let word of words) {
            if (targets[word]) { // Known solid words
                moveToTarget(targets[word].x, targets[word].y);
                await sleep(1500);
                msgDisplay.textContent += word;
            } else {
                for (let char of word) {
                    if (targets[char]) {
                        moveToTarget(targets[char].x, targets[char].y);
                        await sleep(1200);
                        msgDisplay.textContent += char;
                    }
                }
            }
            msgDisplay.textContent += " ";
            await sleep(1000);
        }
        
        if (msg !== 'GOODBYE') {
            await sleep(1000);
            moveToTarget(targets['GOODBYE'].x, targets['GOODBYE'].y);
        }
        
        activeMoveTimeout = setTimeout(() => {
            autoMode = false;
            initPos();
        }, 2000);
    };

    const questionInput = document.getElementById('question-input');
    const askBtn = document.getElementById('ask-btn');

    const handleQuestion = async () => {
        if(autoMode) return;
        const question = questionInput.value.trim();
        if(!question) return;
        
        questionInput.value = "";
        questionInput.disabled = true;
        
        const answers = [
             "YES", "NO", "MAYBE", "DEATH", "RUN", "SOON", "NEVER", "UNKNOWN", 
             "IT IS CERTAIN", "DO NOT ASK", "I CANNOT SAY", "THE SPIRITS LAUGH", "666"
        ];
        const msg = answers[Math.floor(Math.random() * answers.length)];
        
        // Short pause before the spirit answers
        await sleep(1000);
        await spellMessage(msg);
        
        questionInput.disabled = false;
    };

    askBtn.addEventListener('click', handleQuestion);
    questionInput.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') handleQuestion();
    });

    // Button Events
    autoBtn.addEventListener('click', () => {
        if(autoMode) return;
        const messages = [
             "HELLO", "GHOST", "I SEE YOU", "NO", "RUN", "YES", "SPIRIT", "DEATH",
             "BEHIND YOU", "666", "HELP", "DARKNESS", "SOUL", "DEMON", "ALONE", "COLD"
        ];
        const msg = messages[Math.floor(Math.random() * messages.length)];
        spellMessage(msg);
    });

    resetBtn.addEventListener('click', () => {
        autoMode = false;
        clearTimeout(activeMoveTimeout);
        initPos();
    });

    // Make 'YES', 'NO', 'GOODBYE' clickable on the SVG
    document.querySelector('.word.yes').addEventListener('click', () => { if(!autoMode) spellMessage('YES'); });
    document.querySelector('.word.no').addEventListener('click', () => { if(!autoMode) spellMessage('NO'); });
    document.querySelector('.word.goodbye').addEventListener('click', () => { if(!autoMode) spellMessage('GOODBYE'); });
    
    window.addEventListener('resize', () => {
        if (!autoMode && !isDragging) {
            initPos();
        }
    });

});
