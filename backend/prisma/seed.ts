import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create default admin user
  const adminPasswordHash = await bcrypt.hash('adminadmin', 10)

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@example.com',
      passwordHash: adminPasswordHash,
      name: '系统管理员',
      role: 'admin',
      status: 'approved',
      requirePasswordChange: true
    }
  })
  console.log('✅ Created admin user:', adminUser.username)
  console.log('   - Email:', adminUser.email)
  console.log('   - Password: adminadmin (首次登录需要修改)')

  // Create test users for development
  const passwordHash = await bcrypt.hash('password123', 10)

  const salesUser = await prisma.user.upsert({
    where: { email: 'sales@example.com' },
    update: {},
    create: {
      username: 'sales_user',
      email: 'sales@example.com',
      passwordHash,
      name: '张三',
      role: 'sales',
      status: 'approved'
    }
  })
  console.log('✅ Created sales user:', salesUser.username)

  const leaderUser = await prisma.user.upsert({
    where: { email: 'leader@example.com' },
    update: {},
    create: {
      username: 'leader_user',
      email: 'leader@example.com',
      passwordHash,
      name: '李四',
      role: 'leader',
      status: 'approved'
    }
  })
  console.log('✅ Created leader user:', leaderUser.username)

  // Upsert distributors with channel classification - 山东省区域
  const distributor1 = await prisma.distributor.upsert({
    where: {
      name_region: {
        name: '济南鲁商贸易有限公司',
        region: '山东省/济南市/历下区'
      }
    },
    update: {
      channelType: 'basic_plate',  // 基本盘渠道
      quarterlyTarget: 1500,
      quarterlyCompleted: 950,
      projectCount: 8,
      projectAmount: 2800
    },
    create: {
      name: '济南鲁商贸易有限公司',
      region: '山东省/济南市/历下区',
      contactPerson: '王经理',
      phone: '13800138001',
      cooperationLevel: 'gold',
      creditLimit: 500,
      tags: 'VIP,Strategic Partner,Long-term',
      historicalPerformance: '年销售额5000万',
      notes: '重点客户，合作5年',
      ownerUserId: salesUser.id,
      channelType: 'basic_plate',  // 基本盘渠道
      quarterlyTarget: 1500,
      quarterlyCompleted: 950,
      projectCount: 8,
      projectAmount: 2800
    }
  })
  console.log('✅ Upserted distributor:', distributor1.name)

  const distributor2 = await prisma.distributor.upsert({
    where: {
      name_region: {
        name: '青岛海通商贸',
        region: '山东省/青岛市/市南区'
      }
    },
    update: {
      channelType: 'high_value',  // 高价值渠道
      quarterlyTarget: 2000,
      quarterlyCompleted: 1200,
      projectCount: 5,
      projectAmount: 1800
    },
    create: {
      name: '青岛海通商贸',
      region: '山东省/青岛市/市南区',
      contactPerson: '刘总',
      phone: '13900139002',
      cooperationLevel: 'silver',
      creditLimit: 300,
      tags: 'High Volume,New Partner',
      historicalPerformance: '年销售额3000万',
      notes: '新合作伙伴，潜力大',
      ownerUserId: salesUser.id,
      channelType: 'high_value',  // 高价值渠道
      quarterlyTarget: 2000,
      quarterlyCompleted: 1200,
      projectCount: 5,
      projectAmount: 1800
    }
  })
  console.log('✅ Upserted distributor:', distributor2.name)

  const distributor3 = await prisma.distributor.upsert({
    where: {
      name_region: {
        name: '烟台港城物流',
        region: '山东省/烟台市/芝罘区'
      }
    },
    update: {
      channelType: 'normal_gold',  // 普通金牌
      quarterlyTarget: 800,
      quarterlyCompleted: 450,
      projectCount: 3,
      projectAmount: 650
    },
    create: {
      name: '烟台港城物流',
      region: '山东省/烟台市/芝罘区',
      contactPerson: '陈主管',
      phone: '13700137003',
      cooperationLevel: 'bronze',
      creditLimit: 100,
      tags: 'Long-term',
      historicalPerformance: '年销售额1000万',
      notes: '稳定合作',
      ownerUserId: salesUser.id,
      channelType: 'normal_gold',  // 普通金牌
      quarterlyTarget: 800,
      quarterlyCompleted: 450,
      projectCount: 3,
      projectAmount: 650
    }
  })
  console.log('✅ Upserted distributor:', distributor3.name)

  // Create more distributors for testing
  const distributor4 = await prisma.distributor.upsert({
    where: {
      name_region: {
        name: '潍坊齐鲁科技有限公司',
        region: '山东省/潍坊市/奎文区'
      }
    },
    update: {
      channelType: 'high_value',
      quarterlyTarget: 3000,
      quarterlyCompleted: 2100,
      projectCount: 12,
      projectAmount: 4500
    },
    create: {
      name: '潍坊齐鲁科技有限公司',
      region: '山东省/潍坊市/奎文区',
      contactPerson: '周总',
      phone: '13600136004',
      cooperationLevel: 'platinum',
      creditLimit: 800,
      tags: 'High-tech,Innovation',
      historicalPerformance: '年销售额8000万',
      notes: '高价值合作伙伴',
      ownerUserId: salesUser.id,
      channelType: 'high_value',
      quarterlyTarget: 3000,
      quarterlyCompleted: 2100,
      projectCount: 12,
      projectAmount: 4500
    }
  })
  console.log('✅ Upserted distributor:', distributor4.name)

  const distributor5 = await prisma.distributor.upsert({
    where: {
      name_region: {
        name: '临沂商城集团',
        region: '山东省/临沂市/兰山区'
      }
    },
    update: {
      channelType: 'pending',  // 待签约
      quarterlyTarget: 500,
      quarterlyCompleted: 0,
      projectCount: 0,
      projectAmount: 0
    },
    create: {
      name: '临沂商城集团',
      region: '山东省/临沂市/兰山区',
      contactPerson: '吴经理',
      phone: '13500135005',
      cooperationLevel: 'silver',
      creditLimit: 200,
      tags: 'E-commerce',
      historicalPerformance: '年销售额2000万',
      notes: '待签约合作',
      ownerUserId: salesUser.id,
      channelType: 'pending',  // 待签约
      quarterlyTarget: 500,
      quarterlyCompleted: 0,
      projectCount: 0,
      projectAmount: 0
    }
  })
  console.log('✅ Upserted distributor:', distributor5.name)

  // Create tasks
  const task1 = await prisma.task.create({
    data: {
      distributorId: distributor1.id,
      assignedUserId: salesUser.id,
      creatorUserId: leaderUser.id,
      title: '跟进华东区域分销商合作',
      description: '联系华东区域潜在分销商，洽谈合作事宜',
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      priority: 'high',
      status: 'in_progress'
    }
  })
  console.log('✅ Created task:', task1.title)

  const task2 = await prisma.task.create({
    data: {
      distributorId: distributor2.id,
      assignedUserId: salesUser.id,
      creatorUserId: salesUser.id,
      title: '完成季度销售报告',
      description: '整理Q3季度销售数据，准备汇报材料',
      deadline: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
      priority: 'urgent',
      status: 'pending'
    }
  })
  console.log('✅ Created task:', task2.title)

  const task3 = await prisma.task.create({
    data: {
      distributorId: distributor3.id,
      assignedUserId: salesUser.id,
      creatorUserId: leaderUser.id,
      title: '新分销商资质审核',
      description: '审核新申请分销商的相关资质文件',
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
      priority: 'medium',
      status: 'pending'
    }
  })
  console.log('✅ Created task:', task3.title)

  // Create task comments
  await prisma.taskComment.create({
    data: {
      taskId: task1.id,
      userId: salesUser.id,
      content: '已经和客户初步沟通，对方表示有合作意向'
    }
  })

  await prisma.taskComment.create({
    data: {
      taskId: task1.id,
      userId: leaderUser.id,
      content: '建议准备详细的产品目录和价格表'
    }
  })
  console.log('✅ Created task comments')

  // Create events
  await prisma.event.create({
    data: {
      eventType: 'user_registered',
      entityType: 'user',
      entityId: salesUser.id,
      userId: salesUser.id,
      payload: JSON.stringify({ username: salesUser.username, role: salesUser.role })
    }
  })

  await prisma.event.create({
    data: {
      eventType: 'distributor_created',
      entityType: 'distributor',
      entityId: distributor1.id,
      userId: salesUser.id,
      payload: JSON.stringify({ name: distributor1.name, region: distributor1.region })
    }
  })
  console.log('✅ Created audit events')

  // Create channel targets
  const currentYear = new Date().getFullYear()
  const currentQuarter = `Q${Math.floor(new Date().getMonth() / 3) + 1}`

  const quarterlyTarget = await prisma.channelTarget.create({
    data: {
      year: currentYear,
      quarter: currentQuarter,
      targetType: 'quarterly',
      newSignTarget: 500,
      coreOpportunity: 5000,
      coreRevenue: 10000,
      highValueOpp: 3000,
      highValueRevenue: 6000,
      newSignCompleted: 300,
      coreOppCompleted: 3200,
      coreRevCompleted: 6500,
      highValueOppComp: 2100,
      highValueRevComp: 4200,
      description: `${currentYear}年${currentQuarter}季度渠道目标`,
      userId: leaderUser.id
    }
  })
  console.log('✅ Created quarterly target')

  // Create work plans
  const currentMonth = new Date().getMonth() + 1
  const workPlan1 = await prisma.workPlan.create({
    data: {
      distributorId: distributor1.id,
      userId: salesUser.id,
      year: currentYear,
      month: currentMonth,
      opportunitySource: '行业展会、客户推荐、市场调研',
      projectMgmt: '跟进现有8个项目，重点推进3个大单',
      channelActions: '安排季度业务回顾会议，讨论下季度合作计划',
      status: 'executing'
    }
  })
  console.log('✅ Created work plan for distributor1')

  const workPlan2 = await prisma.workPlan.create({
    data: {
      distributorId: distributor2.id,
      userId: salesUser.id,
      year: currentYear,
      month: currentMonth,
      opportunitySource: '互联网营销、社交媒体推广',
      projectMgmt: '新项目立项，准备投标文件',
      channelActions: '完成合作协议续签，争取更优惠条件',
      status: 'planning'
    }
  })
  console.log('✅ Created work plan for distributor2')

  // Create weekly reviews
  const weekNumber = Math.ceil(new Date().getDate() / 7)
  await prisma.weeklyReview.create({
    data: {
      workPlanId: workPlan1.id,
      weekNumber,
      year: currentYear,
      progress: '本周完成2个项目的初步方案，客户反馈积极',
      obstacles: '部分技术细节需要总部支持，等待技术方案确认',
      adjustments: '下周重点跟进技术方案，安排客户现场演示'
    }
  })
  console.log('✅ Created weekly review')

  console.log('🎉 Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
