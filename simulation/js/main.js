class MSISimulator {
    constructor() {
        this.CACHE_LINES = 4;
        this.numProcessors = 2;
        this.caches = [];
        this.memory = new Map();
        this.transitionLog = [];
        
        // Virtual Labs color scheme
        this.colors = {
            primary: '#176696',
            secondary: '#2C9AD1', 
            accent: '#98CB3B',
            neutral: '#96A0A3',
            white: '#FFFFFF',
            background: '#F8F9FA',
            text: '#2C3E50'
        };
        
        this.init();
    }
    
    init() {
        this.initializeCaches();
        this.setupEventListeners();
        this.renderCacheTables();
        this.renderStateDiagrams();
        this.updateDataInputState();
    }
    
    initializeCaches() {
        this.caches = [];
        for (let i = 0; i < this.numProcessors; i++) {
            this.caches.push({
                lines: Array(this.CACHE_LINES).fill(null).map(() => ({
                    state: 'I',
                    data: null,
                    tag: null,
                    valid: false
                })),
                stats: { hits: 0, misses: 0 }
            });
        }
    }
    
    setupEventListeners() {
        document.getElementById('execute-btn').addEventListener('click', () => this.executeOperation());
        document.getElementById('operation-select').addEventListener('change', () => this.updateDataInputState());
    }

    updateDataInputState() {
        const operation = document.getElementById('operation-select').value;
        const dataInput = document.getElementById('data-input');
        
        if (operation === 'PrWr') {
            dataInput.disabled = false;
            dataInput.placeholder = 'Enter data value';
        } else {
            dataInput.disabled = true;
            dataInput.placeholder = 'N/A for read operations';
            dataInput.value = '';
        }
    }

    executeOperation() {
        const processorId = parseInt(document.getElementById('processor-select').value);
        const operation = document.getElementById('operation-select').value;
        const address = parseInt(document.getElementById('address-select').value);
        const data = document.getElementById('data-input').value;

        if (operation === 'PrWr' && !data) {
            alert('Please enter a data value for write operations.');
            return;
        }

        this.processRequest(processorId, operation, address, data);
    }

    processRequest(processorId, operation, address, data) {
        const cacheLine = this.caches[processorId].lines[address];
        const otherProcessorId = 1 - processorId;
        const otherCacheLine = this.caches[otherProcessorId].lines[address];
        
        let busActivity = '--';
        let prevP0State = this.caches[0].lines[address].state;
        let prevP1State = this.caches[1].lines[address].state;

        if (operation === 'PrRd') {
            if (cacheLine.state === 'I') {
                this.caches[processorId].stats.misses++;
                busActivity = 'BusRd';
                
                if (otherCacheLine.state === 'M') {
                    // Flush from other cache
                    this.memory.set(address, otherCacheLine.data);
                    otherCacheLine.state = 'S';
                }
                
                cacheLine.state = 'S';
                cacheLine.data = this.memory.get(address) || '0'; // Default to 0 if not in memory
                cacheLine.valid = true;
            } else {
                this.caches[processorId].stats.hits++;
            }
        } else if (operation === 'PrWr') {
            if (cacheLine.state === 'I') {
                this.caches[processorId].stats.misses++;
                busActivity = 'BusRdX';
                
                if (otherCacheLine.state === 'M') {
                    this.memory.set(address, otherCacheLine.data);
                }
                otherCacheLine.state = 'I';
                
                cacheLine.state = 'M';
                cacheLine.data = data;
                cacheLine.valid = true;
            } else if (cacheLine.state === 'S') {
                this.caches[processorId].stats.misses++; // Coherence miss
                busActivity = 'BusUpgr';
                otherCacheLine.state = 'I';
                cacheLine.state = 'M';
                cacheLine.data = data;
            } else if (cacheLine.state === 'M') {
                this.caches[processorId].stats.hits++;
                cacheLine.data = data;
            }
        }
        
        this.logTransition(processorId, operation, address, busActivity, prevP0State, prevP1State);
    }

    logTransition(processorId, operation, address, busActivity, prevP0State, prevP1State) {
        const newCaches = JSON.parse(JSON.stringify(this.caches));
        const cacheLine = newCaches[processorId].lines[address];
        const otherCacheLine = newCaches[1 - processorId].lines[address];
        
        let memContent = this.memory.get(address) || '-';
        if (busActivity.includes('Flush') || (prevP0State === 'M' && busActivity !== '--') || (prevP1State === 'M' && busActivity !== '--')) {
            if (processorId === 0 && prevP0State === 'M') memContent = this.caches[0].lines[address].data;
            if (processorId === 1 && prevP1State === 'M') memContent = this.caches[1].lines[address].data;
        }

        const logEntry = {
            processorActivity: `P${processorId}: ${operation}(0x${address.toString(16)})`,
            busActivity: busActivity,
            p0Transition: '--',
            p1Transition: '--'
        };

        if (processorId === 0) {
            const prevCurrentState = this.caches[0].lines[address].state;
            logEntry.p0Transition = `${prevCurrentState}→${cacheLine.state}`;
            
            const prevOtherState = this.caches[1].lines[address].state;
            logEntry.p1Transition = `${prevOtherState}→${otherCacheLine.state}`;

        } else { // processorId === 1
            const prevCurrentState = this.caches[1].lines[address].state;
            logEntry.p1Transition = `${prevCurrentState}→${cacheLine.state}`;

            const prevOtherState = this.caches[0].lines[address].state;
            logEntry.p0Transition = `${prevOtherState}→${otherCacheLine.state}`;
        }

        logEntry.p0Content = newCaches[0].lines[address].data || '-';
        logEntry.p0State = newCaches[0].lines[address].state;
        logEntry.p1Content = newCaches[1].lines[address].data || '-';
        logEntry.p1State = newCaches[1].lines[address].state;
        logEntry.memoryContent = memContent;

        this.caches = newCaches;
        this.transitionLog.unshift(logEntry);
        
        this.renderCacheTables();
        this.renderTransactionLog();
        this.renderStateDiagrams();
    }
    
    renderCacheTables() {
        for (let i = 0; i < this.numProcessors; i++) {
            const tbody = document.getElementById(`p${i}-cache-body`);
            const cache = this.caches[i];
            
            tbody.innerHTML = '';
            
            for (let j = 0; j < this.CACHE_LINES; j++) {
                const line = cache.lines[j];
                const row = document.createElement('tr');
                
                if (line.valid) {
                    row.classList.add('valid-line');
                }
                
                row.innerHTML = `
                    <td>0x${j.toString(16).toUpperCase()}</td>
                    <td class="state-${line.state.toLowerCase()}">${line.state}</td>
                    <td>${line.data || '-'}</td>
                    <td>${line.valid ? 'Yes' : 'No'}</td>
                `;
                
                tbody.appendChild(row);
            }
            
            // Update performance stats
            const performanceSpan = document.getElementById(`p${i}-performance`);
            const hits = cache.stats.hits;
            const misses = cache.stats.misses;
            const total = hits + misses;
            
            let performanceText = `Hits: ${hits}, Misses: ${misses}`;
            if (total > 0) {
                const hitRate = ((hits / total) * 100).toFixed(1);
                performanceText += ` (Hit Rate: ${hitRate}%)`;
            }
            
            performanceSpan.textContent = performanceText;
        }
    }
    
    renderTransactionLog() {
        const logEmpty = document.getElementById('log-empty');
        const logTableContainer = document.getElementById('log-table-container');
        const logTableBody = document.getElementById('log-table-body');
        
        if (this.transitionLog.length === 0) {
            logEmpty.style.display = 'block';
            logTableContainer.style.display = 'none';
        } else {
            logEmpty.style.display = 'none';
            logTableContainer.style.display = 'block';
            
            logTableBody.innerHTML = '';
            
            this.transitionLog.forEach((entry, index) => {
                const row = document.createElement('tr');
                
                if (index === 0) {
                    row.classList.add('latest-entry');
                }
                
                row.innerHTML = `
                    <td>${entry.processorActivity}</td>
                    <td>${entry.busActivity}</td>
                    <td>${entry.p0Content}</td>
                    <td class="state-${entry.p0State.toLowerCase()}">${entry.p0State}</td>
                    <td>${entry.p0Transition}</td>
                    <td>${entry.p1Content}</td>
                    <td class="state-${entry.p1State.toLowerCase()}">${entry.p1State}</td>
                    <td>${entry.p1Transition}</td>
                    <td>${entry.memoryContent}</td>
                `;
                
                logTableBody.appendChild(row);
            });
        }
    }
    
    renderStateDiagrams() {
        this.renderStateDiagram('p0', this.transitionLog[0]?.p0State || 'I', this.transitionLog[0]?.p0Transition || '');
        this.renderStateDiagram('p1', this.transitionLog[0]?.p1State || 'I', this.transitionLog[0]?.p1Transition || '');
    }
      renderStateDiagram(view, state, transition) {
        const svg = document.getElementById(`${view}-diagram`);
        const highlightArrowColor = view === 'p0' ? this.colors.primary : this.colors.secondary;
        const strokeColor = this.colors.neutral;
        
        const pathMapping = {
            'I→S': 'i-to-s',
            'I→M': 'i-to-m', 
            'S→M': 's-to-m',
            'S→I': 's-to-i',
            'M→S': 'm-to-s',
            'M→I': 'm-to-i',
            'M→M': 'm-self',
            'S→S': 's-self',
            'I→I': 'i-self'
        };
        
        const highlightPathId = pathMapping[transition] || '';
        
        svg.innerHTML = `
            <defs>
                <marker id="arrow-${view}" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto" markerUnits="strokeWidth">
                    <path d="M0,0 L8,4 L0,8 Z" fill="${strokeColor}" />
                </marker>
                <marker id="highlight-arrow-${view}" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto" markerUnits="strokeWidth">
                    <path d="M0,0 L8,4 L0,8 Z" fill="${highlightArrowColor}" />
                </marker>
            </defs>

            <!-- Self-loops -->
            <path d="M250,60 C290,20 210,20 250,60" fill="none" 
                  stroke="${highlightPathId === 'm-self' ? highlightArrowColor : strokeColor}" 
                  stroke-width="${highlightPathId === 'm-self' ? 3 : 2}"
                  marker-end="url(#${highlightPathId === 'm-self' ? 'highlight-arrow-' + view : 'arrow-' + view})" />
            
            <path d="M410,300 C450,260 450,340 410,300" fill="none" 
                  stroke="${highlightPathId === 's-self' ? highlightArrowColor : strokeColor}"
                  stroke-width="${highlightPathId === 's-self' ? 3 : 2}"
                  marker-end="url(#${highlightPathId === 's-self' ? 'highlight-arrow-' + view : 'arrow-' + view})" />
            
            <path d="M90,300 C50,260 50,340 90,300" fill="none" 
                  stroke="${highlightPathId === 'i-self' ? highlightArrowColor : strokeColor}"
                  stroke-width="${highlightPathId === 'i-self' ? 3 : 2}"
                  marker-end="url(#${highlightPathId === 'i-self' ? 'highlight-arrow-' + view : 'arrow-' + view})" />

            <!-- State transitions -->
            <path d="M275,125 L345,275" fill="none" 
                  stroke="${highlightPathId === 'm-to-s' ? highlightArrowColor : strokeColor}"
                  stroke-width="${highlightPathId === 'm-to-s' ? 3 : 2}"
                  marker-end="url(#${highlightPathId === 'm-to-s' ? 'highlight-arrow-' + view : 'arrow-' + view})" />
            
            <path d="M345,275 Q480,130 275,125" fill="none" 
                  stroke="${highlightPathId === 's-to-m' ? highlightArrowColor : strokeColor}"
                  stroke-width="${highlightPathId === 's-to-m' ? 3 : 2}"
                  marker-end="url(#${highlightPathId === 's-to-m' ? 'highlight-arrow-' + view : 'arrow-' + view})" />
            
            <path d="M225,125 L155,275" fill="none" 
                  stroke="${highlightPathId === 'm-to-i' ? highlightArrowColor : strokeColor}"
                  stroke-width="${highlightPathId === 'm-to-i' ? 3 : 2}"
                  marker-end="url(#${highlightPathId === 'm-to-i' ? 'highlight-arrow-' + view : 'arrow-' + view})" />
            
            <path d="M330,300 L170,300" fill="none" 
                  stroke="${highlightPathId === 's-to-i' ? highlightArrowColor : strokeColor}"
                  stroke-width="${highlightPathId === 's-to-i' ? 3 : 2}"
                  marker-end="url(#${highlightPathId === 's-to-i' ? 'highlight-arrow-' + view : 'arrow-' + view})" />
              <path d="M170,300 Q250,420 330,300" fill="none" 
                  stroke="${highlightPathId === 'i-to-s' ? highlightArrowColor : strokeColor}"
                  stroke-width="${highlightPathId === 'i-to-s' ? 3 : 2}"
                  marker-end="url(#${highlightPathId === 'i-to-s' ? 'highlight-arrow-' + view : 'arrow-' + view})" />
            
            <path d="M155,275 L225,125" fill="none" 
                  stroke="${highlightPathId === 'i-to-m' ? highlightArrowColor : strokeColor}"
                  stroke-width="${highlightPathId === 'i-to-m' ? 3 : 2}"
                  marker-end="url(#${highlightPathId === 'i-to-m' ? 'highlight-arrow-' + view : 'arrow-' + view})" />

            <path d="M225,125 Q50,150 155,275" fill="none" 
                  stroke="${highlightPathId === 'm-to-i' ? highlightArrowColor : strokeColor}"
                  stroke-width="${highlightPathId === 'm-to-i' ? 3 : 2}"
                  marker-end="url(#${highlightPathId === 'm-to-i' ? 'highlight-arrow-' + view : 'arrow-' + view})" />

            <!-- Transition Labels -->
            <!-- Modified state self-loop labels -->
            <text x="250" y="25" font-size="11" 
                  fill="${highlightPathId === 'm-self' ? highlightArrowColor : this.colors.text}" 
                  text-anchor="middle" 
                  font-weight="${highlightPathId === 'm-self' ? 'bold' : 'normal'}">
                PrRd / --
            </text>
            <text x="250" y="10" font-size="11" 
                  fill="${highlightPathId === 'm-self' ? highlightArrowColor : this.colors.text}" 
                  text-anchor="middle" 
                  font-weight="${highlightPathId === 'm-self' ? 'bold' : 'normal'}">
                PrWr / --
            </text>
            
            <!-- Shared state self-loop label -->
            <text x="430" y="325" font-size="11" 
                  fill="${highlightPathId === 's-self' ? highlightArrowColor : this.colors.text}" 
                  text-anchor="start" 
                  font-weight="${highlightPathId === 's-self' ? 'bold' : 'normal'}">
                PrRd / --
            </text>

            <!-- Invalid state self-loop labels -->
            <text x="78" y="335" font-size="10" 
                  fill="${highlightPathId === 'i-self' ? highlightArrowColor : this.colors.text}" 
                  text-anchor="end" 
                  font-weight="${highlightPathId === 'i-self' ? 'bold' : 'normal'}">
                BusRd / --
            </text>
            <text x="78" y="350" font-size="10" 
                  fill="${highlightPathId === 'i-self' ? highlightArrowColor : this.colors.text}" 
                  text-anchor="end" 
                  font-weight="${highlightPathId === 'i-self' ? 'bold' : 'normal'}">
                BusUpgr / --
            </text>
            <text x="78" y="365" font-size="10" 
                  fill="${highlightPathId === 'i-self' ? highlightArrowColor : this.colors.text}" 
                  text-anchor="end" 
                  font-weight="${highlightPathId === 'i-self' ? 'bold' : 'normal'}">
                BusRdX / --
            </text>

            <!-- Modified to Shared transition labels -->
            <text x="310" y="180" font-size="10" 
                  fill="${highlightPathId === 'm-to-s' ? highlightArrowColor : this.colors.text}" 
                  text-anchor="start" 
                  font-weight="${highlightPathId === 'm-to-s' ? 'bold' : 'normal'}">
                PrRd / --
            </text>
            <text x="310" y="195" font-size="10" 
                  fill="${highlightPathId === 'm-to-s' ? highlightArrowColor : this.colors.text}" 
                  text-anchor="start" 
                  font-weight="${highlightPathId === 'm-to-s' ? 'bold' : 'normal'}">
                BusRd / Flush
            </text>

            <!-- Shared to Modified transition labels -->
            <text x="407" y="140" font-size="10" 
                  fill="${highlightPathId === 's-to-m' ? highlightArrowColor : this.colors.text}" 
                  text-anchor="start" 
                  font-weight="${highlightPathId === 's-to-m' ? 'bold' : 'normal'}">
                PrWr /
            </text>
            <text x="407" y="155" font-size="10" 
                  fill="${highlightPathId === 's-to-m' ? highlightArrowColor : this.colors.text}" 
                  text-anchor="start" 
                  font-weight="${highlightPathId === 's-to-m' ? 'bold' : 'normal'}">
                BusUpgr
            </text>

            <!-- Shared to Invalid transition labels -->
            <text x="250" y="315" font-size="10" 
                  fill="${highlightPathId === 's-to-i' ? highlightArrowColor : this.colors.text}" 
                  text-anchor="middle" 
                  font-weight="${highlightPathId === 's-to-i' ? 'bold' : 'normal'}">
                BusRdX / --
            </text>
            <text x="250" y="330" font-size="10" 
                  fill="${highlightPathId === 's-to-i' ? highlightArrowColor : this.colors.text}" 
                  text-anchor="middle" 
                  font-weight="${highlightPathId === 's-to-i' ? 'bold' : 'normal'}">
                BusUpgr / --
            </text>

            <!-- Invalid to Shared transition label -->
            <text x="250" y="380" font-size="10" 
                  fill="${highlightPathId === 'i-to-s' ? highlightArrowColor : this.colors.text}" 
                  text-anchor="middle" 
                  font-weight="${highlightPathId === 'i-to-s' ? 'bold' : 'normal'}">
                PrRd / BusRd
            </text>

            <!-- Invalid to Modified transition labels -->
            <text x="175" y="190" font-size="10" 
                  fill="${highlightPathId === 'i-to-m' ? highlightArrowColor : this.colors.text}" 
                  text-anchor="end" 
                  font-weight="${highlightPathId === 'i-to-m' ? 'bold' : 'normal'}">
                PrWr /
            </text>
            <text x="175" y="205" font-size="10" 
                  fill="${highlightPathId === 'i-to-m' ? highlightArrowColor : this.colors.text}" 
                  text-anchor="end" 
                  font-weight="${highlightPathId === 'i-to-m' ? 'bold' : 'normal'}">
                BusRdX
            </text>

            <!-- Modified to Invalid transition labels -->
            <text x="95" y="190" font-size="10" 
                  fill="${highlightPathId === 'm-to-i' ? highlightArrowColor : this.colors.text}" 
                  text-anchor="end" 
                  font-weight="${highlightPathId === 'm-to-i' ? 'bold' : 'normal'}">
                BusRdX /
            </text>
            <text x="95" y="205" font-size="10" 
                  fill="${highlightPathId === 'm-to-i' ? highlightArrowColor : this.colors.text}" 
                  text-anchor="end" 
                  font-weight="${highlightPathId === 'm-to-i' ? 'bold' : 'normal'}">
                Flush
            </text>

            <!-- State circles -->
            <circle cx="250" cy="100" r="40" 
                    fill="${state === 'M' ? this.colors.accent : this.colors.white}"
                    stroke="${state === 'M' ? this.colors.primary : this.colors.neutral}"
                    stroke-width="3" />
            <text x="250" y="105" text-anchor="middle" font-size="24" fill="${this.colors.text}" font-weight="bold">M</text>
            <text x="250" y="120" text-anchor="middle" font-size="12" fill="${this.colors.text}">(Modified)</text>
            
            <circle cx="370" cy="300" r="40"
                    fill="${state === 'S' ? this.colors.accent : this.colors.white}"
                    stroke="${state === 'S' ? this.colors.primary : this.colors.neutral}"
                    stroke-width="3" />
            <text x="370" y="305" text-anchor="middle" font-size="24" fill="${this.colors.text}" font-weight="bold">S</text>
            <text x="370" y="320" text-anchor="middle" font-size="12" fill="${this.colors.text}">(Shared)</text>
            
            <circle cx="130" cy="300" r="40"
                    fill="${state === 'I' ? this.colors.accent : this.colors.white}"
                    stroke="${state === 'I' ? this.colors.primary : this.colors.neutral}"
                    stroke-width="3" />
            <text x="130" y="305" text-anchor="middle" font-size="24" fill="${this.colors.text}" font-weight="bold">I</text>
            <text x="130" y="320" text-anchor="middle" font-size="12" fill="${this.colors.text}">(Invalid)</text>
        `;
    }
}

// Initialize the simulator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new MSISimulator();
});
