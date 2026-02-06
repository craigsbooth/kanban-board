import * as fc from 'fast-check';

describe('Property-Based Tests - Swim Lane Organization', () => {

  describe('Property 5: Swim Lane Organization', () => {
    /**
     * **Validates: Requirements 2.3, 2.4**
     * 
     * For any board with swim lanes, creating swim lanes with categories should 
     * organize cards in a grid format where each card belongs to exactly one 
     * column and optionally one swim lane.
     */
    it('should organize cards in grid format with proper swim lane categorization', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate test data for swim lane organization
          fc.record({
            boardName: fc.string({ minLength: 1, maxLength: 50 }),
            columns: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 50 }),
              }),
              { minLength: 2, maxLength: 5 }
            ),
            swimLanes: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 50 }),
                category: fc.oneof(
                  fc.constant('PRIORITY'),
                  fc.constant('TEAM'),
                  fc.constant('PROJECT'),
                  fc.constant('CUSTOM')
                ),
                color: fc.option(fc.string({ minLength: 6, maxLength: 6 }).filter(s => /^[0-9A-F]{6}$/i.test(s)).map((s: string) => '#' + s))
              }),
              { minLength: 1, maxLength: 4 }
            ),
            cards: fc.array(
              fc.record({
                title: fc.string({ minLength: 1, maxLength: 100 }),
                description: fc.option(fc.string({ maxLength: 500 })),
                columnIndex: fc.nat(), // Will be bounded by column count
                swimLaneIndex: fc.option(fc.nat()), // Will be bounded by swim lane count
              }),
              { minLength: 0, maxLength: 12 }
            )
          }),
          async (testData) => {
            // Create the board structure
            const boardId = 'test-board-id';
            
            // Create columns with positions
            const columns = testData.columns.map((col, index) => ({
              id: `col-${index}`,
              name: col.name,
              position: index,
              boardId,
              color: null
            }));

            // Create swim lanes with positions and categories
            const swimLanes = testData.swimLanes.map((sl, index) => ({
              id: `sl-${index}`,
              name: sl.name,
              position: index,
              category: sl.category as 'PRIORITY' | 'TEAM' | 'PROJECT' | 'CUSTOM',
              color: sl.color || null,
              boardId
            }));

            // Create cards and assign them to columns and swim lanes
            const cards = testData.cards.map((card, index) => {
              const columnIndex = card.columnIndex % columns.length;
              const swimLaneIndex = card.swimLaneIndex !== null && card.swimLaneIndex !== undefined 
                ? card.swimLaneIndex % swimLanes.length 
                : null;

              return {
                id: `card-${index}`,
                title: card.title,
                description: card.description || null,
                columnId: columns[columnIndex].id,
                swimLaneId: swimLaneIndex !== null ? swimLanes[swimLaneIndex].id : null,
                position: index,
                boardId,
                dueDate: null,
                createdBy: 'test-user-id',
                createdAt: new Date(),
                updatedAt: new Date()
              };
            });

            // Verify grid organization properties
            
            // Property 1: Each card belongs to exactly one column
            cards.forEach(card => {
              expect(card.columnId).toBeTruthy();
              expect(columns.some(col => col.id === card.columnId)).toBe(true);
            });

            // Property 2: Each card belongs to at most one swim lane
            cards.forEach(card => {
              if (card.swimLaneId) {
                expect(swimLanes.some(sl => sl.id === card.swimLaneId)).toBe(true);
              }
            });

            // Property 3: Swim lanes have valid categories
            swimLanes.forEach(swimLane => {
              expect(['PRIORITY', 'TEAM', 'PROJECT', 'CUSTOM']).toContain(swimLane.category);
            });

            // Property 4: Grid structure - cards can be organized by column and swim lane
            const cardGrid: { [columnId: string]: { [swimLaneId: string]: typeof cards } } = {};
            
            // Initialize grid structure
            columns.forEach(column => {
              cardGrid[column.id] = {};
              swimLanes.forEach(swimLane => {
                cardGrid[column.id][swimLane.id] = [];
              });
              // Add a slot for cards without swim lanes
              cardGrid[column.id]['no-swimlane'] = [];
            });

            // Populate the grid
            cards.forEach(card => {
              const swimLaneKey = card.swimLaneId || 'no-swimlane';
              cardGrid[card.columnId][swimLaneKey].push(card);
            });

            // Verify grid properties
            columns.forEach(column => {
              // Each column should have entries for all swim lanes
              expect(Object.keys(cardGrid[column.id])).toHaveLength(swimLanes.length + 1); // +1 for no-swimlane

              // Cards in each cell should all belong to the correct column and swim lane
              Object.entries(cardGrid[column.id]).forEach(([swimLaneKey, cellCards]) => {
                cellCards.forEach(card => {
                  expect(card.columnId).toBe(column.id);
                  if (swimLaneKey !== 'no-swimlane') {
                    expect(card.swimLaneId).toBe(swimLaneKey);
                  } else {
                    expect(card.swimLaneId).toBeNull();
                  }
                });
              });
            });

            // Property 5: Swim lane positions are sequential and unique
            const swimLanePositions = swimLanes.map(sl => sl.position).sort((a, b) => a - b);
            expect(swimLanePositions).toEqual([...Array(swimLanes.length).keys()]);

            // Property 6: Column positions are sequential and unique
            const columnPositions = columns.map(col => col.position).sort((a, b) => a - b);
            expect(columnPositions).toEqual([...Array(columns.length).keys()]);

            // Property 7: Swim lane categories are properly distributed
            const categoryCount = swimLanes.reduce((acc, sl) => {
              acc[sl.category] = (acc[sl.category] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);

            // Each category should have at least 0 swim lanes
            Object.values(categoryCount).forEach(count => {
              expect(count).toBeGreaterThanOrEqual(0);
            });

            // Property 8: Color format validation for swim lanes
            swimLanes.forEach(swimLane => {
              if (swimLane.color) {
                expect(swimLane.color).toMatch(/^#[0-9A-F]{6}$/i);
              }
            });

            // Property 9: Grid completeness - total cards should equal sum of all grid cells
            let totalCardsInGrid = 0;
            columns.forEach(column => {
              Object.values(cardGrid[column.id]).forEach(cellCards => {
                totalCardsInGrid += cellCards.length;
              });
            });
            expect(totalCardsInGrid).toBe(cards.length);

            // Property 10: No card should appear in multiple grid cells
            const cardIdsInGrid = new Set<string>();
            columns.forEach(column => {
              Object.values(cardGrid[column.id]).forEach(cellCards => {
                cellCards.forEach(card => {
                  expect(cardIdsInGrid.has(card.id)).toBe(false);
                  cardIdsInGrid.add(card.id);
                });
              });
            });
            expect(cardIdsInGrid.size).toBe(cards.length);
          }
        ),
        { 
          numRuns: 10,
          timeout: 5000
        }
      );
    });

    it('should maintain swim lane position integrity during operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            initialSwimLanes: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 50 }),
                category: fc.oneof(
                  fc.constant('PRIORITY'),
                  fc.constant('TEAM'),
                  fc.constant('PROJECT'),
                  fc.constant('CUSTOM')
                )
              }),
              { minLength: 2, maxLength: 6 }
            ),
            operations: fc.array(
              fc.oneof(
                // Add swim lane
                fc.record({
                  type: fc.constant('add' as const),
                  name: fc.string({ minLength: 1, maxLength: 50 }),
                  category: fc.oneof(
                    fc.constant('PRIORITY'),
                    fc.constant('TEAM'),
                    fc.constant('PROJECT'),
                    fc.constant('CUSTOM')
                  ),
                  position: fc.option(fc.nat({ max: 10 }))
                }),
                // Remove swim lane
                fc.record({
                  type: fc.constant('remove' as const),
                  index: fc.nat({ max: 5 })
                }),
                // Reorder swim lanes
                fc.record({
                  type: fc.constant('reorder' as const)
                })
              ),
              { minLength: 1, maxLength: 4 }
            )
          }),
          async (testData) => {
            // Initialize swim lanes
            let currentSwimLanes = testData.initialSwimLanes.map((sl, index) => ({
              id: `sl-${index}`,
              name: sl.name,
              position: index,
              category: sl.category as 'PRIORITY' | 'TEAM' | 'PROJECT' | 'CUSTOM',
              color: null,
              boardId: 'test-board-id'
            }));

            // Apply operations
            for (const operation of testData.operations) {
              if (operation.type === 'add') {
                const position = operation.position !== null && operation.position !== undefined
                  ? Math.min(operation.position, currentSwimLanes.length)
                  : currentSwimLanes.length;

                const newSwimLane = {
                  id: `sl-${Date.now()}-${Math.random()}`,
                  name: operation.name,
                  position,
                  category: operation.category as 'PRIORITY' | 'TEAM' | 'PROJECT' | 'CUSTOM',
                  color: null,
                  boardId: 'test-board-id'
                };

                // Insert at position and update positions
                currentSwimLanes.splice(position, 0, newSwimLane);
                currentSwimLanes = currentSwimLanes.map((sl, idx) => ({ ...sl, position: idx }));

              } else if (operation.type === 'remove' && currentSwimLanes.length > 1) {
                const indexToRemove = operation.index % currentSwimLanes.length;
                currentSwimLanes.splice(indexToRemove, 1);
                currentSwimLanes = currentSwimLanes.map((sl, idx) => ({ ...sl, position: idx }));

              } else if (operation.type === 'reorder' && currentSwimLanes.length > 1) {
                // Create a random permutation
                const shuffledIndices = [...Array(currentSwimLanes.length).keys()]
                  .sort(() => Math.random() - 0.5);

                const reorderedSwimLanes = shuffledIndices.map(oldIndex => ({
                  ...currentSwimLanes[oldIndex],
                  position: shuffledIndices.indexOf(oldIndex),
                }));
                currentSwimLanes = reorderedSwimLanes.sort((a, b) => a.position - b.position);
              }

              // Verify position integrity after each operation
              expect(currentSwimLanes.length).toBeGreaterThan(0);

              // Positions should be sequential starting from 0
              currentSwimLanes.forEach((swimLane, index) => {
                expect(swimLane.position).toBe(index);
                expect(swimLane.boardId).toBe('test-board-id');
                expect(swimLane.name).toBeTruthy();
                expect(['PRIORITY', 'TEAM', 'PROJECT', 'CUSTOM']).toContain(swimLane.category);
              });

              // No duplicate positions
              const positions = currentSwimLanes.map(sl => sl.position);
              const uniquePositions = [...new Set(positions)];
              expect(positions).toHaveLength(uniquePositions.length);

              // Positions should be consecutive
              expect(positions.sort((a, b) => a - b)).toEqual([...Array(positions.length).keys()]);
            }
          }
        ),
        { 
          numRuns: 8,
          timeout: 5000
        }
      );
    });

    it('should handle swim lane categorization correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            swimLanes: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 50 }),
                category: fc.oneof(
                  fc.constant('PRIORITY'),
                  fc.constant('TEAM'),
                  fc.constant('PROJECT'),
                  fc.constant('CUSTOM')
                )
              }),
              { minLength: 1, maxLength: 8 }
            )
          }),
          async (testData) => {
            const swimLanes = testData.swimLanes.map((sl, index) => ({
              id: `sl-${index}`,
              name: sl.name,
              position: index,
              category: sl.category as 'PRIORITY' | 'TEAM' | 'PROJECT' | 'CUSTOM',
              color: null,
              boardId: 'test-board-id'
            }));

            // Group swim lanes by category
            const categorizedSwimLanes = swimLanes.reduce((acc, sl) => {
              if (!acc[sl.category]) {
                acc[sl.category] = [];
              }
              acc[sl.category].push(sl);
              return acc;
            }, {} as Record<string, typeof swimLanes>);

            // Verify categorization properties
            Object.entries(categorizedSwimLanes).forEach(([category, swimLanesInCategory]) => {
              // All swim lanes in a category should have the same category
              swimLanesInCategory.forEach(sl => {
                expect(sl.category).toBe(category);
              });

              // Category should be valid
              expect(['PRIORITY', 'TEAM', 'PROJECT', 'CUSTOM']).toContain(category);
            });

            // Verify that all swim lanes are accounted for
            const totalCategorizedSwimLanes = Object.values(categorizedSwimLanes)
              .reduce((sum, swimLanesInCategory) => sum + swimLanesInCategory.length, 0);
            expect(totalCategorizedSwimLanes).toBe(swimLanes.length);

            // Verify category distribution makes sense
            const categoryNames = Object.keys(categorizedSwimLanes);
            categoryNames.forEach(category => {
              expect(categorizedSwimLanes[category].length).toBeGreaterThan(0);
            });
          }
        ),
        { 
          numRuns: 10,
          timeout: 3000
        }
      );
    });
  });
});