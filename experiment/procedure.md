## Procedure

Follow these step-by-step instructions to understand and explore the MSI Cache Coherence Protocol using the interactive simulator.

### Step 1: Understanding the Interface

1. **Observe the Initial State**
   - Notice that both processor caches start with all cache lines in the **Invalid (I)** state
   - The state diagrams show the current state of each processor's cache
   - The transaction log is initially empty

2. **Familiarize with the Components**
   - **Cache State Diagrams**: Visual representation of MSI states (M, S, I) for each processor
   - **Simulation Controls**: Interface to select processor, operation type, address, and data
   - **Processor Cache States**: Table showing the detailed state of each cache line
   - **Bus Transaction Log**: Historical record of all operations and state transitions

### Step 2: Basic Read Operations

1. **First Read Operation**
   - Select **Processor 0** from the dropdown
   - Choose **PrRd (Processor Read)** as the operation type
   - Select memory address **0x0**
   - Click **"Execute Operation"**

2. **Observe the Results**
   - Cache line at index 0 in Processor 0 transitions from **I → S**
   - Bus activity shows **BusRd** transaction
   - Data is loaded from memory into the cache
   - Note the cache miss recorded in performance statistics

3. **Repeat with Second Processor**
   - Select **Processor 1**
   - Perform the same read operation on address **0x0**
   - Observe that Processor 1 also gets the data in **Shared (S)** state
   - Both processors now have the same data in **Shared** state

### Step 3: Write Operations and Invalidations

1. **Write to Shared Data**
   - Keep **Processor 1** selected
   - Change operation to **PrWr (Processor Write)**
   - Select address **0x0** (same as previous reads)
   - Enter a data value (e.g., "42") in the data field
   - Click **"Execute Operation"**

2. **Analyze State Changes**
   - Processor 1's cache line transitions from **S → M**
   - Processor 0's cache line transitions from **S → I** (invalidated)
   - Bus activity shows **BusUpgr** transaction
   - Only Processor 1 now has valid data for this address

### Step 4: Modified State Operations

1. **Read from Modified Cache**
   - With **Processor 1** still selected
   - Change back to **PrRd (Processor Read)**
   - Read from address **0x0**
   - Observe that this is a **cache hit** and state remains **Modified (M)**

2. **Write to Modified Cache**
   - Change to **PrWr (Processor Write)**
   - Enter a new data value (e.g., "100")
   - Write to address **0x0**
   - Notice this is also a **cache hit** with no bus activity needed

### Step 5: Cache Line Sharing After Modification

1. **Another Processor Reads Modified Data**
   - Select **Processor 0**
   - Choose **PrRd (Processor Read)**
   - Read from address **0x0** (which Processor 1 has modified)
   - Click **"Execute Operation"**

2. **Observe Write-Back and Sharing**
   - Processor 1's cache transitions from **M → S**
   - Processor 0's cache transitions from **I → S**
   - Data is written back to memory and shared
   - Both processors now have consistent data in **Shared** state

### Step 6: Exploring Different Addresses

1. **Access Different Memory Locations**
   - Try operations on addresses **0x1**, **0x2**, and **0x3**
   - Observe how different cache lines are affected
   - Notice that cache coherence operates independently for each cache line

2. **Create Complex Scenarios**
   - Mix read and write operations across different processors
   - Try patterns like: P0 writes to 0x0, P1 writes to 0x1, then cross-access
   - Observe how cache performance metrics change

### Step 7: Performance Analysis

1. **Monitor Cache Performance**
   - Pay attention to the hit/miss ratios for each processor
   - Notice how coherence protocol overhead affects performance
   - Compare performance for read-only vs. read-write workloads

2. **Analyze Transaction Patterns**
   - Study the bus transaction log to understand communication overhead
   - Identify patterns in state transitions
   - Observe the relationship between processor operations and bus activities

### Step 8: Advanced Scenarios

1. **False Sharing Simulation**
   - Have both processors write to different addresses that map to the same cache line
   - Observe unnecessary invalidations due to spatial locality

2. **Producer-Consumer Pattern**
   - Simulate one processor writing data (producer)
   - Have the other processor read the data (consumer)
   - Observe the coherence protocol maintaining consistency

### Expected Learning Outcomes

After completing this procedure, you should understand:

- How the MSI protocol maintains cache coherence across multiple processors
- The relationship between processor operations, bus transactions, and state transitions
- Performance implications of different access patterns in shared-memory systems
- The trade-offs between cache performance and coherence overhead
- Real-world applications of cache coherence protocols in multicore systems

### Troubleshooting Tips

- If no changes occur, ensure you've clicked "Execute Operation"
- Remember that data values are only required for write operations
- Use the transaction log to trace the history of operations
- Reset the simulation by refreshing the page if needed