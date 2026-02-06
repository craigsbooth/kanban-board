import { prisma } from '../../lib/prisma'
import bcrypt from 'bcryptjs'

export interface TestUser {
  id: string
  username: string
  email: string
  passwordHash: string
  createdAt: Date
  updatedAt: Date
}

export interface TestBoard {
  id: string
  name: string
  description?: string
  ownerId: string
  inviteToken: string
  createdAt: Date
  updatedAt: Date
}

export async function createTestUser(
  userData: Partial<{ username: string; email: string; password: string }> = {}
): Promise<TestUser> {
  const defaultData = {
    username: `testuser_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    email: `test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}@example.com`,
    password: 'TestPassword123'
  }

  const data = { ...defaultData, ...userData }
  const passwordHash = await bcrypt.hash(data.password, 12)

  return await prisma.user.create({
    data: {
      username: data.username,
      email: data.email,
      passwordHash
    }
  })
}

export async function createTestBoard(
  ownerId: string,
  boardData: Partial<{ name: string; description: string }> = {}
): Promise<TestBoard> {
  const defaultData = {
    name: `Test Board ${Date.now()}`,
    description: 'Test board description'
  }

  const data = { ...defaultData, ...boardData }

  return await prisma.board.create({
    data: {
      name: data.name,
      description: data.description,
      ownerId,
      columns: {
        create: [
          { name: 'To Do', position: 0 },
          { name: 'In Progress', position: 1 },
          { name: 'Done', position: 2 },
        ],
      },
    },
    include: {
      columns: {
        orderBy: { position: 'asc' },
      },
    },
  }) as any
}

export async function cleanupTestData(): Promise<void> {
  // Delete in order to respect foreign key constraints
  await prisma.cardSubscription.deleteMany({
    where: {
      card: {
        board: {
          owner: {
            email: {
              contains: '@example.com'
            }
          }
        }
      }
    }
  })

  await prisma.comment.deleteMany({
    where: {
      card: {
        board: {
          owner: {
            email: {
              contains: '@example.com'
            }
          }
        }
      }
    }
  })

  await prisma.checklistItem.deleteMany({
    where: {
      checklist: {
        card: {
          board: {
            owner: {
              email: {
                contains: '@example.com'
              }
            }
          }
        }
      }
    }
  })

  await prisma.checklist.deleteMany({
    where: {
      card: {
        board: {
          owner: {
            email: {
              contains: '@example.com'
            }
          }
        }
      }
    }
  })

  await prisma.customField.deleteMany({
    where: {
      card: {
        board: {
          owner: {
            email: {
              contains: '@example.com'
            }
          }
        }
      }
    }
  })

  await prisma.attachment.deleteMany({
    where: {
      card: {
        board: {
          owner: {
            email: {
              contains: '@example.com'
            }
          }
        }
      }
    }
  })

  await prisma.label.deleteMany({
    where: {
      card: {
        board: {
          owner: {
            email: {
              contains: '@example.com'
            }
          }
        }
      }
    }
  })

  await prisma.card.deleteMany({
    where: {
      board: {
        owner: {
          email: {
            contains: '@example.com'
          }
        }
      }
    }
  })

  await prisma.boardMember.deleteMany({
    where: {
      board: {
        owner: {
          email: {
            contains: '@example.com'
          }
        }
      }
    }
  })

  await prisma.swimLane.deleteMany({
    where: {
      board: {
        owner: {
          email: {
            contains: '@example.com'
          }
        }
      }
    }
  })

  await prisma.column.deleteMany({
    where: {
      board: {
        owner: {
          email: {
            contains: '@example.com'
          }
        }
      }
    }
  })

  await prisma.board.deleteMany({
    where: {
      owner: {
        email: {
          contains: '@example.com'
        }
      }
    }
  })

  await prisma.user.deleteMany({
    where: {
      email: {
        contains: '@example.com'
      }
    }
  })
}

export async function createTestColumn(
  boardId: string,
  columnData: Partial<{ name: string; position: number; color: string }> = {}
) {
  const defaultData = {
    name: `Test Column ${Date.now()}`,
    position: 0
  }

  const data = { ...defaultData, ...columnData }

  return await prisma.column.create({
    data: {
      name: data.name,
      position: data.position,
      color: data.color,
      boardId
    }
  })
}

export async function createTestSwimLane(
  boardId: string,
  swimLaneData: Partial<{ name: string; position: number; category: string; color: string }> = {}
) {
  const defaultData = {
    name: `Test Swim Lane ${Date.now()}`,
    position: 0,
    category: 'CUSTOM' as const
  }

  const data = { ...defaultData, ...swimLaneData }

  return await prisma.swimLane.create({
    data: {
      name: data.name,
      position: data.position,
      category: data.category as any,
      color: data.color,
      boardId
    }
  })
}