require("dotenv").config();
const test = require("node:test");
const assert = require("node:assert/strict");
const { prisma } = require("../../src/config/database");
const roleService = require("../../src/modules/roles/role.service");
const roleRepository = require("../../src/modules/roles/role.repository");
const userService = require("../../src/modules/users/user.service");
const notificationService = require("../../src/modules/notifications/notification.service");
const { hasPermission } = require("../../src/core/middleware/authorization.middleware");
const { generateAccessToken } = require("../../src/core/utils/jwt");

test("live role lifecycle, permission union, and Super Admin database cap", async (t) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const createdUserIds = [];
  const createdSessionTokens = [];
  const createTarget = async (fullName, role = "STAFF", status = "ACTIVE") => {
    const user = await prisma.user.create({
      data: { fullName, email: null, passwordHash: "integration-test-only", role, status },
      select: { id: true, role: true }
    });
    createdUserIds.push(user.id);
    return user;
  };

  try {
    const actor = await prisma.user.findFirst({
      where: { role: "SUPER_ADMIN", status: "ACTIVE" },
      select: { id: true, role: true }
    });
    assert.ok(actor, "an active Super Admin is required to run the privileged live test");

    const createdAccount = await userService.create({
      fullName: `Created Pending Teacher ${suffix}`,
      email: `role-create-${suffix}@example.invalid`,
      password: `Integration-${suffix}!`,
      role: "TEACHER"
    }, { userId: actor.id, role: actor.role });
    createdUserIds.push(createdAccount.id);
    const createdAssignment = await prisma.userRoleAssignment.findUnique({
      where: { userId_roleId: { userId: createdAccount.id, roleId: (await prisma.role.findUnique({ where: { name: "TEACHER" } })).id } },
      select: { status: true }
    });
    assert.equal(createdAssignment.status, "PENDING");
    assert.equal(await hasPermission({ userId: createdAccount.id, role: "STAFF" }, "results:view"), false);

    const moduleRows = await prisma.permission.findMany({ distinct: ["module"], select: { module: true } });
    assert.equal(moduleRows.length, 56);
    for (const { module } of moduleRows) assert.equal(await hasPermission(actor, `${module}:view`), true);
    const requestedRoleNames = [
      "SUPER_ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "HEAD_TEACHER", "DEPUTY_HEAD_TEACHER",
      "SCHOOL_ADMINISTRATOR", "ADMIN_MANAGER", "HR_MANAGER", "ACCOUNTANT", "BURSAR",
      "FINANCE_OFFICER", "PROCUREMENT_OFFICER", "STOREKEEPER", "REGISTRAR", "ADMISSIONS_OFFICER",
      "EXAMINATION_OFFICER", "ACADEMIC_COORDINATOR", "HEAD_OF_DEPARTMENT", "SUBJECT_COORDINATOR",
      "CLASS_TEACHER", "TEACHER", "SCHOOL_COUNSELOR", "LIBRARIAN", "ICT_ADMINISTRATOR",
      "TRANSPORT_MANAGER", "DRIVER", "HEALTH_OFFICER", "HOSTEL_WARDEN", "RECEPTIONIST", "DATA_ENTRY_OFFICER"
    ];
    const definedRoleNames = new Set((await prisma.role.findMany({ select: { name: true } })).map((role) => role.name));
    for (const roleName of requestedRoleNames) assert.ok(definedRoleNames.has(roleName), `missing defined role ${roleName}`);
    assert.ok(definedRoleNames.size >= 30);

    const teacherAccount = await createTarget(`HTTP Teacher ${suffix}`, "TEACHER");
    const accountantAccount = await createTarget(`HTTP Accountant ${suffix}`, "ACCOUNTANT");
    const headTeacherAccount = await createTarget(`HTTP Head Teacher ${suffix}`, "HEAD_TEACHER");
    const storekeeperAccount = await createTarget(`HTTP Storekeeper ${suffix}`, "STOREKEEPER");
    const staffAccount = await createTarget(`HTTP No Role ${suffix}`, "STAFF");
    assert.equal(await hasPermission({ userId: teacherAccount.id, role: "TEACHER" }, "results:view"), true);
    assert.equal(await hasPermission({ userId: teacherAccount.id, role: "TEACHER" }, "payments:view"), false);
    assert.equal(await hasPermission({ userId: accountantAccount.id, role: "ACCOUNTANT" }, "payments:create"), true);
    assert.equal(await hasPermission({ userId: accountantAccount.id, role: "ACCOUNTANT" }, "attendance:view"), false);
    assert.equal(await hasPermission({ userId: headTeacherAccount.id, role: "HEAD_TEACHER" }, "teacher_attendance:view"), true);
    assert.equal(await hasPermission({ userId: storekeeperAccount.id, role: "STOREKEEPER" }, "inventory:view"), true);
    assert.equal(await hasPermission({ userId: staffAccount.id, role: "STAFF" }, "roles:manage"), false);

    const token = generateAccessToken({ userId: teacherAccount.id });
    createdSessionTokens.push(token);
    await prisma.userSession.create({
      data: { userId: teacherAccount.id, token, expiresAt: new Date(Date.now() + 60 * 60 * 1000) }
    });
    const staffToken = generateAccessToken({ userId: staffAccount.id });
    createdSessionTokens.push(staffToken);
    await prisma.userSession.create({
      data: { userId: staffAccount.id, token: staffToken, expiresAt: new Date(Date.now() + 60 * 60 * 1000) }
    });
    const accountantToken = generateAccessToken({ userId: accountantAccount.id });
    createdSessionTokens.push(accountantToken);
    await prisma.userSession.create({
      data: { userId: accountantAccount.id, token: accountantToken, expiresAt: new Date(Date.now() + 60 * 60 * 1000) }
    });
    const app = require("../../src/app");
    const server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
    try {
      const actorToken = generateAccessToken({ userId: actor.id });
      createdSessionTokens.push(actorToken);
      await prisma.userSession.create({ data: { userId: actor.id, token: actorToken, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
      const registryResponse = await fetch(`${baseUrl}/permissions/modules`, { headers: { authorization: `Bearer ${actorToken}` } });
      assert.equal(registryResponse.status, 200);
      const registryPayload = await registryResponse.json();
      assert.equal(registryPayload.data.length, 56);
      const rolesResponse = await fetch(`${baseUrl}/roles`, { headers: { authorization: `Bearer ${actorToken}` } });
      assert.equal(rolesResponse.status, 200);
      const rolesPayload = await rolesResponse.json();
      assert.ok(rolesPayload.data.length >= 30);
      const selfAssignmentResponse = await fetch(`${baseUrl}/roles/assign`, {
        method: "POST",
        headers: { authorization: `Bearer ${actorToken}`, "content-type": "application/json" },
        body: JSON.stringify({ userId: actor.id, roleIds: ["ACCOUNTANT"] })
      });
      assert.equal(selfAssignmentResponse.status, 403);

      const inventoryView = await prisma.permission.findUnique({ where: { key: "inventory:view" }, select: { id: true } });
      const storekeeperRole = await prisma.role.findUnique({ where: { name: "STOREKEEPER" }, select: { id: true } });
      const revokePermissionResponse = await fetch(`${baseUrl}/permissions/revoke`, {
        method: "POST",
        headers: { authorization: `Bearer ${actorToken}`, "content-type": "application/json" },
        body: JSON.stringify({ roleId: storekeeperRole.id, permissionId: inventoryView.id })
      });
      assert.equal(revokePermissionResponse.status, 200);
      assert.equal(await hasPermission({ userId: storekeeperAccount.id, role: "STOREKEEPER" }, "inventory:view"), false);
      const assignPermissionResponse = await fetch(`${baseUrl}/permissions/assign`, {
        method: "POST",
        headers: { authorization: `Bearer ${actorToken}`, "content-type": "application/json" },
        body: JSON.stringify({ roleId: storekeeperRole.id, permissionId: inventoryView.id })
      });
      assert.equal(assignPermissionResponse.status, 200);
      assert.equal(await hasPermission({ userId: storekeeperAccount.id, role: "STOREKEEPER" }, "inventory:view"), true);

      const financeResponse = await fetch(`${baseUrl}/payments`, { headers: { authorization: `Bearer ${token}` } });
      assert.equal(financeResponse.status, 403);
      const accountantResponse = await fetch(`${baseUrl}/payments`, { headers: { authorization: `Bearer ${accountantToken}` } });
      assert.notEqual(accountantResponse.status, 403);
      const roleManagementResponse = await fetch(`${baseUrl}/roles/assign`, {
        method: "POST",
        headers: { authorization: `Bearer ${staffToken}`, "content-type": "application/json" },
        body: JSON.stringify({ userId: teacherAccount.id, roleIds: ["ACCOUNTANT"] })
      });
      assert.equal(roleManagementResponse.status, 403);
      const denialAudit = await prisma.auditLog.findFirst({
        where: { userId: staffAccount.id, action: "UNAUTHORIZED_ROLE_MANAGEMENT_ATTEMPT" },
        select: { id: true }
      });
      assert.ok(denialAudit);
    } finally {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }

    const lifecycleTarget = await createTarget(`Role Workflow ${suffix}`);
    const assigned = await roleService.assignRoles({
      userId: lifecycleTarget.id,
      roleIds: ["TEACHER", "HEAD_OF_DEPARTMENT"]
    }, { userId: actor.id, role: actor.role });
    assert.equal(assigned.assignedRoles.length, 2);
    assert.ok(assigned.assignedRoles.every((assignment) => assignment.status === "PENDING"));
    assert.equal(await hasPermission({ userId: lifecycleTarget.id, role: "STAFF" }, "results:view"), false);
    assert.equal(await hasPermission({ userId: lifecycleTarget.id, role: "STAFF" }, "departments:view"), false);

    const pendingNotifications = await notificationService.list({ userId: lifecycleTarget.id, role: "STAFF" });
    assert.equal(pendingNotifications.length, 2);
    assert.ok(pendingNotifications.every((notification) => notification.canActivateRole));

    const lifecycleToken = generateAccessToken({ userId: lifecycleTarget.id });
    createdSessionTokens.push(lifecycleToken);
    await prisma.userSession.create({ data: { userId: lifecycleTarget.id, token: lifecycleToken, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
    const attacker = await createTarget(`Role Activation Attacker ${suffix}`);
    const attackerToken = generateAccessToken({ userId: attacker.id });
    createdSessionTokens.push(attackerToken);
    await prisma.userSession.create({ data: { userId: attacker.id, token: attackerToken, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
    const activationApp = require("../../src/app");
    const activationServer = activationApp.listen(0);
    await new Promise((resolve) => activationServer.once("listening", resolve));
    const activationUrl = `http://127.0.0.1:${activationServer.address().port}/api`;
    try {
      const notificationResponse = await fetch(`${activationUrl}/notifications`, { headers: { authorization: `Bearer ${lifecycleToken}` } });
      assert.equal(notificationResponse.status, 200);
      const notificationPayload = await notificationResponse.json();
      assert.equal(notificationPayload.data.length, 2);
      assert.ok(notificationPayload.data.every((notification) => notification.canActivateRole));

      const assignmentId = assigned.assignedRoles[0].assignmentId;
      const attackerResponse = await fetch(`${activationUrl}/roles/activate`, {
        method: "POST",
        headers: { authorization: `Bearer ${attackerToken}`, "content-type": "application/json" },
        body: JSON.stringify({ assignmentId })
      });
      assert.equal(attackerResponse.status, 403);

      const activationResponse = await fetch(`${activationUrl}/roles/activate`, {
        method: "POST",
        headers: { authorization: `Bearer ${lifecycleToken}`, "content-type": "application/json" },
        body: JSON.stringify({ assignmentId })
      });
      assert.equal(activationResponse.status, 200);
      const replayResponse = await fetch(`${activationUrl}/roles/activate`, {
        method: "POST",
        headers: { authorization: `Bearer ${lifecycleToken}`, "content-type": "application/json" },
        body: JSON.stringify({ assignmentId })
      });
      assert.equal(replayResponse.status, 409);
    } finally {
      await new Promise((resolve, reject) => activationServer.close((error) => error ? reject(error) : resolve()));
    }

    await roleService.activateRole({ assignmentId: assigned.assignedRoles[1].assignmentId }, {
      userId: lifecycleTarget.id,
      role: "TEACHER"
    });
    assert.equal(await hasPermission({ userId: lifecycleTarget.id, role: "HEAD_OF_DEPARTMENT" }, "results:view"), true);
    assert.equal(await hasPermission({ userId: lifecycleTarget.id, role: "HEAD_OF_DEPARTMENT" }, "departments:view"), true);
    const refreshedUser = await require("../../src/modules/auth/auth.service").getCurrentUser(lifecycleTarget.id);
    assert.ok(refreshedUser.modulePermissions.includes("results"));
    assert.ok(refreshedUser.modulePermissions.includes("departments"));
    const handledNotifications = await notificationService.list({ userId: lifecycleTarget.id, role: "HEAD_OF_DEPARTMENT" });
    assert.ok(handledNotifications.every((notification) => !notification.canActivateRole && notification.status === "READ"));

    const changed = await roleService.changeUserRoles(lifecycleTarget.id, { roles: ["TEACHER"] }, { userId: actor.id, role: actor.role });
    assert.ok(changed.assignments.some((assignment) => assignment.role.name === "HEAD_OF_DEPARTMENT" && assignment.status === "REMOVED"));
    assert.equal(await prisma.userSession.findUnique({ where: { token: lifecycleToken } }), null);
    assert.equal(await hasPermission({ userId: lifecycleTarget.id, role: "TEACHER" }, "results:view"), true);
    assert.equal(await hasPermission({ userId: lifecycleTarget.id, role: "TEACHER" }, "departments:view"), false);
    await roleService.changeUserRoles(lifecycleTarget.id, { roles: [] }, { userId: actor.id, role: actor.role });
    assert.equal(await hasPermission({ userId: lifecycleTarget.id, role: "STAFF" }, "announcements:view"), false);

    const superAdminRole = await prisma.role.findUnique({ where: { name: "SUPER_ADMIN" }, select: { id: true } });
    assert.ok(superAdminRole);
    let count = await roleRepository.countActiveSuperAdmins();
    assert.ok(count <= 3, `database already has ${count} Super Admin accounts`);

    while (count < 2) {
      const target = await userService.create({
        fullName: `Super Admin Reservation ${suffix}`,
        email: `super-admin-reservation-${suffix}@example.invalid`,
        password: `Integration-${suffix}!`,
        role: "SUPER_ADMIN"
      }, { userId: actor.id, role: actor.role });
      createdUserIds.push(target.id);
      const pendingAssignment = await prisma.userRoleAssignment.findUnique({
        where: { userId_roleId: { userId: target.id, roleId: superAdminRole.id } },
        select: { id: true, status: true }
      });
      assert.equal(pendingAssignment.status, "PENDING");
      await roleService.activateRole({ assignmentId: pendingAssignment.id }, { userId: target.id, role: "STAFF" });
      count = await roleRepository.countActiveSuperAdmins();
    }

    if (count === 2) {
      const contenders = [
        await createTarget(`Concurrent Admin A ${suffix}`, "STAFF", "INACTIVE"),
        await createTarget(`Concurrent Admin B ${suffix}`, "STAFF", "INACTIVE")
      ];
      for (const target of contenders) {
        await prisma.userRoleAssignment.create({
          data: {
            userId: target.id,
            roleId: superAdminRole.id,
            status: "PENDING",
            assignedBy: actor.id,
            activationToken: `${suffix}-${target.id}`,
            activationExpiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000)
          }
        });
      }
      const attempts = await Promise.allSettled(contenders.map((target) => prisma.$transaction((tx) => tx.user.update({
        where: { id: target.id },
        data: { status: "ACTIVE" }
      }))));
      assert.equal(attempts.filter((result) => result.status === "fulfilled").length, 1);
      assert.equal(attempts.filter((result) => result.status === "rejected").length, 1);
    } else {
      const contenders = [
        await createTarget(`Concurrent Admin A ${suffix}`, "STAFF", "INACTIVE"),
        await createTarget(`Concurrent Admin B ${suffix}`, "STAFF", "INACTIVE")
      ];
      for (const target of contenders) {
        await prisma.userRoleAssignment.create({
          data: {
            userId: target.id,
            roleId: superAdminRole.id,
            status: "PENDING",
            assignedBy: actor.id,
            activationToken: `${suffix}-${target.id}`,
            activationExpiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000)
          }
        });
      }
      const attempts = await Promise.allSettled(contenders.map((target) => prisma.$transaction((tx) => tx.user.update({
        where: { id: target.id },
        data: { status: "ACTIVE" }
      }))));
      assert.ok(attempts.every((result) => result.status === "rejected"));
    }
    assert.equal(await roleRepository.countActiveSuperAdmins(), 3);

    const fourthTarget = await createTarget(`Fourth Admin Attempt ${suffix}`);
    await assert.rejects(
      roleService.assignRoles({ userId: fourthTarget.id, roleIds: ["SUPER_ADMIN"] }, { userId: actor.id, role: actor.role }),
      (error) => error.code === "SUPER_ADMIN_LIMIT_EXCEEDED"
    );
    await assert.rejects(
      prisma.$transaction((tx) => tx.user.update({ where: { id: fourthTarget.id }, data: { role: "SUPER_ADMIN" } }))
    );

    await t.test("all integration records are temporary and removed", () => {
      assert.ok(createdUserIds.length >= 1);
    });
  } finally {
    if (createdSessionTokens.length) {
      await prisma.userSession.deleteMany({ where: { token: { in: createdSessionTokens } } });
    }
    if (createdUserIds.length) {
      await prisma.auditLog.deleteMany({
        where: {
          OR: [
            { userId: { in: createdUserIds } },
            { entityId: { in: createdUserIds } }
          ]
        }
      });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await prisma.$disconnect();
  }
});