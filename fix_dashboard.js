const fs = require('fs');
const file = 'D:\\frontend_community\\communtiybackend\\src\\routes\\v1\\admin-dashboard.routes.ts';
let c = fs.readFileSync(file, 'utf8');

const old = `const [
      totalUsers, totalProfiles, totalCommunities, totalCommunityPosts,
      totalEvents, totalFeeds, totalStories, totalComments, totalLikes,
      totalReports, totalNotifications, activeToday,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null, role: { not: 'ADMIN' } } }),
      prisma.user.count({ where: { deletedAt: null, role: { not: 'ADMIN' }, avatarUrl: { not: null } } }),
      prisma.community.count(),
      prisma.post.count({ where: { deletedAt: null, communityId: { not: null } } }),
      prisma.event.count(),
      prisma.post.count({ where: { deletedAt: null, communityId: null } }),
      prisma.story.count(),
      prisma.comment.count({ where: { deletedAt: null } }),
      prisma.like.count(),
      prisma.report.count(),
      prisma.notification.count(),
      prisma.user.count({ where: { deletedAt: null, role: { not: 'ADMIN' }, updatedAt: { gte: today } } }),
    ]);`;

const replacement = `const activeTodayRows = await prisma.$queryRaw\`
      SELECT DISTINCT u FROM (
        SELECT "authorId" AS u FROM "Post" WHERE "createdAt" >= \${today} AND "deletedAt" IS NULL
        UNION ALL
        SELECT "authorId" AS u FROM "Comment" WHERE "createdAt" >= \${today} AND "deletedAt" IS NULL
        UNION ALL
        SELECT "authorId" AS u FROM "Story" WHERE "createdAt" >= \${today}
        UNION ALL
        SELECT "userId" AS u FROM "RefreshToken" WHERE "createdAt" >= \${today}
      ) sub
    \` as { u: string }[];
    const activeToday = activeTodayRows.length;

    const [
      totalUsers, totalProfiles, totalCommunities, totalCommunityPosts,
      totalEvents, totalFeeds, totalStories, totalComments, totalLikes,
      totalReports, totalNotifications,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null, role: { not: 'ADMIN' } } }),
      prisma.user.count({ where: { deletedAt: null, role: { not: 'ADMIN' }, avatarUrl: { not: null } } }),
      prisma.community.count({ where: { status: 'APPROVED' } }),
      prisma.post.count({ where: { deletedAt: null, communityId: { not: null } } }),
      prisma.event.count(),
      prisma.post.count({ where: { deletedAt: null, communityId: null } }),
      prisma.story.count({ where: { expiresAt: { gte: new Date() } } }),
      prisma.comment.count({ where: { deletedAt: null } }),
      prisma.like.count(),
      prisma.report.count(),
      prisma.notification.count(),
    ]);`;

if (!c.includes(old)) {
  console.error('OLD STRING NOT FOUND');
  process.exit(1);
}

c = c.replace(old, replacement);
fs.writeFileSync(file, c, 'utf8');
console.log('DONE');
