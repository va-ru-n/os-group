document.getElementById('runSimulation').addEventListener('click', runSimulation);
        
function runSimulation() {
    // Get input values
    const referenceString = document.getElementById('referenceString').value
        .split(',')
        .map(item => parseInt(item.trim()))
        .filter(item => !isNaN(item));
        
    const frameCount = parseInt(document.getElementById('frameCount').value);
    
    // Get selected algorithms
    const selectedAlgorithms = [];
    if (document.getElementById('fifoCheck').checked) selectedAlgorithms.push('FIFO');
    if (document.getElementById('lruCheck').checked) selectedAlgorithms.push('LRU');
    if (document.getElementById('optimalCheck').checked) selectedAlgorithms.push('Optimal');
    if (document.getElementById('randomCheck').checked) selectedAlgorithms.push('Random');
    
    if (selectedAlgorithms.length === 0) {
        alert('Please select at least one algorithm to run.');
        return;
    }
    
    // Add loading effect
    const btn = document.getElementById('runSimulation');
    btn.innerHTML = '<span class="loading">Running Simulation...</span>';
    btn.disabled = true;
    
    // Run simulations after a small delay to allow UI to update
    setTimeout(() => {
        const results = {};
        selectedAlgorithms.forEach(algo => {
            results[algo] = simulateAlgorithm(algo, referenceString, frameCount);
        });
        
        // Display results
        displayResults(results, referenceString, frameCount);
        
        // Reset button
        btn.innerHTML = 'Run Simulation';
        btn.disabled = false;
    }, 100);
}

function simulateAlgorithm(algorithm, referenceString, frameCount) {
    const frames = [];
    const history = [];
    let pageFaults = 0;
    
    // Data structures for specific algorithms
    let fifoQueue = [];
    let lruLastUsed = {};
    
    // Initialize LRU tracking
    referenceString.forEach(page => {
        lruLastUsed[page] = -1;
    });
    
    // Process each page in reference string
    referenceString.forEach((page, index) => {
        currentStep = index;
        let fault = false;
        
        if (!frames.includes(page)) {
            // Page fault occurred
            pageFaults++;
            fault = true;
            
            if (frames.length < frameCount) {
                // There's space, just add the page
                frames.push(page);
                
                // Algorithm-specific tracking
                if (algorithm === 'FIFO') fifoQueue.push(page);
            } else {
                // Need to replace a page
                let replaceIndex;
                
                switch (algorithm) {
                    case 'FIFO':
                        // Replace the oldest page
                        const oldest = fifoQueue.shift();
                        replaceIndex = frames.indexOf(oldest);
                        frames[replaceIndex] = page;
                        fifoQueue.push(page);
                        break;
                        
                    case 'LRU':
                        // Replace least recently used
                        let lruPage = null;
                        let minLastUsed = Infinity;
                        
                        frames.forEach(framePage => {
                            if (lruLastUsed[framePage] < minLastUsed) {
                                minLastUsed = lruLastUsed[framePage];
                                lruPage = framePage;
                            }
                        });
                        
                        replaceIndex = frames.indexOf(lruPage);
                        frames[replaceIndex] = page;
                        break;
                        
                    case 'Optimal':
                        // Replace the page not used for longest time in future
                        let farthest = -1;
                        let optimalPage = null;
                        
                        frames.forEach(framePage => {
                            // Check when this page will be used next
                            const nextUseIndex = referenceString.slice(index + 1).indexOf(framePage);
                            
                            if (nextUseIndex === -1) {
                                // This page won't be used again, perfect candidate
                                optimalPage = framePage;
                                return;
                            } else if (nextUseIndex > farthest) {
                                farthest = nextUseIndex;
                                optimalPage = framePage;
                            }
                        });
                        
                        replaceIndex = frames.indexOf(optimalPage);
                        frames[replaceIndex] = page;
                        break;
                        
                    case 'Random':
                        // Replace random page
                        replaceIndex = Math.floor(Math.random() * frames.length);
                        frames[replaceIndex] = page;
                        break;
                }
            }
        }
        
        // Update LRU tracking
        lruLastUsed[page] = index;
        
        // Save frame state for visualization
        history.push({
            step: index,
            page: page,
            frames: [...frames],
            fault: fault
        });
    });
    
    return {
        pageFaults: pageFaults,
        history: history
    };
}

function displayResults(results, referenceString, frameCount) {
    const resultsContainer = document.getElementById('resultsContainer');
    const summaryResults = document.getElementById('summaryResults');
    const detailedResults = document.getElementById('detailedResults');
    
    // Show results container with animation
    resultsContainer.style.display = 'block';
    
    // Create summary
    let summaryHTML = '<h3 class="result-title">Summary</h3>';
    summaryHTML += '<p>Reference String: [' + referenceString.join(', ') + ']</p>';
    summaryHTML += '<p>Number of Frames: ' + frameCount + '</p>';
    
    summaryHTML += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-top: 1.5rem;">';
    
    // Find the best algorithm (least page faults)
    let bestAlgo = null;
    let minFaults = Infinity;
    
    for (const algo in results) {
        if (results[algo].pageFaults < minFaults) {
            minFaults = results[algo].pageFaults;
            bestAlgo = algo;
        }
    }
    
    for (const algo in results) {
        const isBest = algo === bestAlgo;
        summaryHTML += `
            <div class="result-card ${isBest ? 'best-algo' : ''}" style="${isBest ? 'border-left-color: var(--success);' : ''}">
                <h4 class="result-title">${algo}</h4>
                <p class="result-value">${results[algo].pageFaults} page faults</p>
                ${isBest ? '<p style="color: var(--success); font-weight: 600;">⭐ Best algorithm for this case</p>' : ''}
                <p>Fault rate: ${(results[algo].pageFaults / referenceString.length * 100).toFixed(1)}%</p>
            </div>
        `;
    }
    
    summaryHTML += '</div>';
    summaryResults.innerHTML = summaryHTML;
    
    // Create detailed results for each algorithm
    detailedResults.innerHTML = '<h3 class="card-title">Detailed Simulation Steps</h3>';
    
    for (const algo in results) {
        const algoResults = results[algo];
        
        detailedResults.innerHTML += `
            <div class="card" style="margin-top: 2rem;">
                <h4 style="margin-top: 0; color: var(--primary);">${algo} Algorithm</h4>
                
                <div class="visualization">
                    <table>
                        <thead>
                            <tr>
                                <th>Step</th>
                                <th>Page</th>
                                ${Array(frameCount).fill().map((_, i) => `<th>Frame ${i+1}</th>`).join('')}
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${algoResults.history.map(step => `
                                <tr ${step.fault ? 'class="page-fault"' : ''}>
                                    <td>${step.step + 1}</td>
                                    <td><strong>${step.page}</strong></td>
                                    ${Array(frameCount).fill().map((_, i) => 
                                        `<td>${step.frames[i] !== undefined ? 
                                            `<span class="frame-value">${step.frames[i]}</span>` : 
                                            '-'}</td>`
                                    ).join('')}
                                    <td>${step.fault ? '<span style="color: var(--danger);">Page Fault</span>' : 'Hit'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    // Add animations to frame values
    setTimeout(() => {
        document.querySelectorAll('.frame-value').forEach((el, i) => {
            el.style.display = 'inline-block';
            el.style.animation = `fadeIn 0.5s ease ${i * 0.05}s forwards`;
            el.style.opacity = '0';
        });
    }, 100);
    
    // Scroll to results
    resultsContainer.scrollIntoView({ behavior: 'smooth' });
}
