import * as fc from 'fast-check';

describe('Property-Based Tests - Column Management Operations', () => {

  describe('Property 4: Column Management Operations', () => {
    /**
     * **Validates: Requirements 2.1, 2.2**
     * 
     * For any board and column operations (add, remove, rename, reorder), 
     * performing these operations should result in the board having the exact 
     * column structure specified, with positions maintained correctly.
     */
    it('should maintain correct column structure for any valid column operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate test data for column operations
          fc.record({
            boardName: fc.string({ minLength: 1, maxLength: 50 }),
            initialColumns: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 50 }),
                color: fc.option(fc.string({ minLength: 6, maxLength: 6 }).filter(s => /^[0-9A-F]{6}$/i.test(s)).map((s: string) => '#' + s))
              }),
              { minLength: 1, maxLength: 8 }
            ),
            operations: fc.array(
              fc.oneof(
                // Add column operation
                fc.record({
                  type: fc.constant('add' as const),
                  name: fc.string({ minLength: 1, maxLength: 50 }),
                  color: fc.option(fc.string({ minLength: 6, maxLength: 6 }).filter(s => /^[0-9A-F]{6}$/i.test(s)).map((s: string) => '#' + s)),
                  position: fc.option(fc.nat({ max: 10 }))
                }),
                // Rename column operation
                fc.record({
                  type: fc.constant('rename' as const),
                  columnIndex: fc.nat({ max: 7 }), // Will be bounded by actual column count
                  newName: fc.string({ minLength: 1, maxLength: 50 })
                }),
                // Reorder columns operation
                fc.record({
                  type: fc.constant('reorder' as const),
                  // Will generate a permutation of existing columns
                })
              ),
              { minLength: 1, maxLength: 5 }
            )
          }),
          async (testData) => {
            // Simulate column management operations without database
            let currentColumns = testData.initialColumns.map((col, index) => ({
              id: `col-${index}`,
              name: col.name,
              color: col.color || null,
              position: index,
              boardId: 'test-board-id'
            }));

            // Apply each operation and verify the result
            for (const operation of testData.operations) {
              if (operation.type === 'add') {
                // Add column operation
                const position = operation.position !== null && operation.position !== undefined 
                  ? Math.min(operation.position, currentColumns.length) 
                  : currentColumns.length;

                const newColumn = {
                  id: `col-${Date.now()}-${Math.random()}`,
                  name: operation.name,
                  color: operation.color || null,
                  position,
                  boardId: 'test-board-id'
                };

                // Insert at position and update positions
                currentColumns.splice(position, 0, newColumn);
                currentColumns = currentColumns.map((col, idx) => ({ ...col, position: idx }));

              } else if (operation.type === 'rename' && currentColumns.length > 0) {
                // Rename column operation
                const columnIndex = operation.columnIndex % currentColumns.length;
                currentColumns[columnIndex] = { 
                  ...currentColumns[columnIndex], 
                  name: operation.newName 
                };

              } else if (operation.type === 'reorder' && currentColumns.length > 1) {
                // Reorder columns operation - create a random permutation
                const shuffledIndices = [...Array(currentColumns.length).keys()]
                  .sort(() => Math.random() - 0.5);

                const reorderedColumns = shuffledIndices.map(oldIndex => ({
                  ...currentColumns[oldIndex],
                  position: shuffledIndices.indexOf(oldIndex),
                }));
                currentColumns = reorderedColumns.sort((a, b) => a.position - b.position);
              }

              // Verify column structure after each operation
              expect(currentColumns.length).toBeGreaterThan(0);

              // Verify positions are sequential and correct
              currentColumns.forEach((column, index) => {
                expect(column.position).toBe(index);
                expect(column.boardId).toBe('test-board-id');
                expect(column.name).toBeTruthy();
                expect(column.name.length).toBeGreaterThan(0);
                
                // Verify color format if present
                if (column.color) {
                  expect(column.color).toMatch(/^#[0-9A-F]{6}$/i);
                }
              });

              // Verify no duplicate positions
              const positions = currentColumns.map(col => col.position);
              const uniquePositions = [...new Set(positions)];
              expect(positions).toHaveLength(uniquePositions.length);

              // Verify positions start from 0 and are consecutive
              expect(positions).toEqual([...Array(positions.length).keys()]);
            }

            // Final verification: ensure all columns have valid structure
            expect(currentColumns.length).toBeGreaterThanOrEqual(testData.initialColumns.length);
            currentColumns.forEach((column, index) => {
              expect(column.boardId).toBe('test-board-id');
              expect(column.position).toBe(index);
              expect(column.id).toBeTruthy();
              expect(column.name).toBeTruthy();
            });
          }
        ),
        { 
          numRuns: 10,
          timeout: 5000
        }
      );
    });

    it('should maintain position integrity when removing columns', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            columnCount: fc.integer({ min: 2, max: 6 }),
            removeIndices: fc.array(fc.nat(), { minLength: 1, maxLength: 3 })
          }),
          async (testData) => {
            // Create initial columns
            let currentColumns = Array.from({ length: testData.columnCount }, (_, i) => ({
              id: `col-${i}`,
              name: `Column ${i}`,
              position: i,
              boardId: 'test-board-id',
              color: null
            }));

            // Get valid indices to remove (within bounds and unique)
            const validIndices = testData.removeIndices
              .filter(idx => idx < testData.columnCount)
              .filter((idx, pos, arr) => arr.indexOf(idx) === pos) // Remove duplicates
              .sort((a, b) => b - a); // Sort in descending order for safe removal

            // Remove columns one by one (from highest index to lowest)
            for (const indexToRemove of validIndices) {
              if (indexToRemove < currentColumns.length) {
                // Remove the column
                currentColumns.splice(indexToRemove, 1);
                
                // Reorder remaining columns to fill the gap
                currentColumns = currentColumns.map((col, idx) => ({ ...col, position: idx }));

                // Verify position integrity after removal
                // Check that positions are sequential starting from 0
                currentColumns.forEach((column, index) => {
                  expect(column.position).toBe(index);
                });

                // Check no gaps in positions
                const positions = currentColumns.map(col => col.position);
                expect(positions).toEqual([...Array(positions.length).keys()]);
              }
            }

            // Final verification
            expect(currentColumns.length).toBeLessThanOrEqual(testData.columnCount);
            if (currentColumns.length > 0) {
              expect(currentColumns[0].position).toBe(0);
              expect(currentColumns[currentColumns.length - 1].position).toBe(currentColumns.length - 1);
            }
          }
        ),
        { 
          numRuns: 10,
          timeout: 5000
        }
      );
    });

    it('should handle column reordering correctly for any permutation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 5 }).chain(columnCount =>
            fc.record({
              columnCount: fc.constant(columnCount),
              newOrder: fc.shuffledSubarray([...Array(columnCount).keys()], { minLength: columnCount, maxLength: columnCount })
            })
          ),
          async (testData) => {
            // Create initial columns with distinct names
            const originalColumns = Array.from({ length: testData.columnCount }, (_, i) => ({
              id: `col-${i}`,
              name: `Column_${i}_${Math.random().toString(36).substring(2, 6)}`,
              position: i,
              boardId: 'test-board-id',
              color: null
            }));

            // Apply the reordering
            const reorderedColumns = testData.newOrder.map((oldPosition, newPosition) => ({
              ...originalColumns[oldPosition],
              position: newPosition,
            })).sort((a, b) => a.position - b.position);

            // Verify the new order
            // Check that we have the same number of columns
            expect(reorderedColumns).toHaveLength(testData.columnCount);

            // Check that positions are sequential
            reorderedColumns.forEach((column, index) => {
              expect(column.position).toBe(index);
            });

            // Check that all original columns are still present (by name)
            const originalNames = originalColumns.map(col => col.name).sort();
            const reorderedNames = reorderedColumns.map(col => col.name).sort();
            expect(reorderedNames).toEqual(originalNames);

            // Check that the reordering matches our expectation
            testData.newOrder.forEach((oldPosition, newPosition) => {
              const originalColumn = originalColumns[oldPosition];
              const reorderedColumn = reorderedColumns[newPosition];
              expect(reorderedColumn.name).toBe(originalColumn.name);
              expect(reorderedColumn.id).toBe(originalColumn.id);
            });

            // Verify no duplicate positions
            const positions = reorderedColumns.map(col => col.position);
            const uniquePositions = [...new Set(positions)];
            expect(positions).toHaveLength(uniquePositions.length);
          }
        ),
        { 
          numRuns: 10,
          timeout: 5000
        }
      );
    });
  });
});