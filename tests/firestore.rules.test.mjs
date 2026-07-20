/**
 * Firestore Security Rules test suite for Wadi Al Buraq CRM.
 *
 * Proves the data-isolation guarantees against the real rules using the
 * Firestore emulator. Run with:  npm run test:rules
 *
 * Requires Java (for the emulator). `test:rules` starts the emulator, runs
 * these tests, and shuts it down automatically.
 */
import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, it } from "node:test";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  addDoc,
} from "firebase/firestore";

const PROJECT_ID = "wadi-al-buraq-rules-test";

let testEnv;

/** Seed baseline users + clients with rules bypassed. */
async function seed() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/empA"), { uid: "empA", name: "Emp A", email: "a@x.com", role: "employee", status: "active" });
    await setDoc(doc(db, "users/empB"), { uid: "empB", name: "Emp B", email: "b@x.com", role: "employee", status: "active" });
    await setDoc(doc(db, "users/mgr"), { uid: "mgr", name: "Manager", email: "m@x.com", role: "manager", status: "active" });
    await setDoc(doc(db, "users/admin"), { uid: "admin", name: "Admin", email: "ad@x.com", role: "admin", status: "active" });
    await setDoc(doc(db, "users/inactive"), { uid: "inactive", name: "Ex", email: "x@x.com", role: "employee", status: "inactive" });
    // Client A belongs to Emp A, Client B belongs to Emp B
    await setDoc(doc(db, "clients/cA"), { assignedEmployeeId: "empA", name: "Client A", mobile: "111", passportNumber: "PA1", status: "New" });
    await setDoc(doc(db, "clients/cB"), { assignedEmployeeId: "empB", name: "Client B", mobile: "222", passportNumber: "PB2", status: "New" });
    await setDoc(doc(db, "sales/sB"), { assignedEmployeeId: "empB", clientId: "cB", invoiceAmount: 500 });
  });
}

// Context helpers
const asEmpA = () => testEnv.authenticatedContext("empA").firestore();
const asEmpB = () => testEnv.authenticatedContext("empB").firestore();
const asMgr = () => testEnv.authenticatedContext("mgr").firestore();
const asAdmin = () => testEnv.authenticatedContext("admin").firestore();
const asAnon = () => testEnv.unauthenticatedContext().firestore();

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

after(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seed();
});

describe("Authentication gate", () => {
  it("blocks an unauthenticated user from reading any client", async () => {
    await assertFails(getDoc(doc(asAnon(), "clients/cA")));
  });

  it("blocks an inactive employee from reading their own data", async () => {
    const db = testEnv.authenticatedContext("inactive").firestore();
    await assertFails(getDoc(doc(db, "clients/cA")));
  });
});

describe("CORE: employee client isolation", () => {
  it("lets Employee A read their own client", async () => {
    await assertSucceeds(getDoc(doc(asEmpA(), "clients/cA")));
  });

  it("BLOCKS Employee B from reading Employee A's client by id", async () => {
    await assertFails(getDoc(doc(asEmpB(), "clients/cA")));
  });

  it("BLOCKS an unscoped client query from an employee (no cross-employee search)", async () => {
    // A query that could return other employees' clients is rejected outright
    await assertFails(getDocs(query(collection(asEmpB(), "clients"))));
  });

  it("BLOCKS Employee B searching Employee A's client by passport number", async () => {
    await assertFails(
      getDocs(query(collection(asEmpB(), "clients"), where("passportNumber", "==", "PA1")))
    );
  });

  it("ALLOWS an employee to query only within their own assigned clients", async () => {
    await assertSucceeds(
      getDocs(query(collection(asEmpA(), "clients"), where("assignedEmployeeId", "==", "empA")))
    );
  });

  it("lets an employee create a client assigned to themselves", async () => {
    await assertSucceeds(
      setDoc(doc(asEmpA(), "clients/newA"), { assignedEmployeeId: "empA", name: "N", mobile: "9", status: "New" })
    );
  });

  it("BLOCKS an employee from creating a client assigned to someone else", async () => {
    await assertFails(
      setDoc(doc(asEmpA(), "clients/steal"), { assignedEmployeeId: "empB", name: "N", mobile: "9", status: "New" })
    );
  });

  it("BLOCKS an employee from reassigning their own client to another employee", async () => {
    await assertFails(updateDoc(doc(asEmpA(), "clients/cA"), { assignedEmployeeId: "empB" }));
  });

  it("BLOCKS an employee from deleting a client (admin-only)", async () => {
    await assertFails(deleteDoc(doc(asEmpA(), "clients/cA")));
  });
});

describe("Manager & admin visibility", () => {
  it("lets a manager read any client", async () => {
    await assertSucceeds(getDoc(doc(asMgr(), "clients/cA")));
    await assertSucceeds(getDoc(doc(asMgr(), "clients/cB")));
  });

  it("lets a manager reassign a client", async () => {
    await assertSucceeds(updateDoc(doc(asMgr(), "clients/cA"), { assignedEmployeeId: "empB" }));
  });

  it("lets only an admin delete a client", async () => {
    await assertFails(deleteDoc(doc(asMgr(), "clients/cA")));
    await assertSucceeds(deleteDoc(doc(asAdmin(), "clients/cB")));
  });
});

describe("Staff directory privacy", () => {
  it("lets an employee read only their own user profile", async () => {
    await assertSucceeds(getDoc(doc(asEmpA(), "users/empA")));
    await assertFails(getDoc(doc(asEmpA(), "users/empB")));
  });

  it("BLOCKS an employee from listing the staff directory", async () => {
    await assertFails(getDocs(collection(asEmpA(), "users")));
  });

  it("lets a manager read the staff directory", async () => {
    await assertSucceeds(getDocs(collection(asMgr(), "users")));
  });
});

describe("Privilege escalation protection", () => {
  it("BLOCKS an employee from changing their own role to admin", async () => {
    await assertFails(updateDoc(doc(asEmpA(), "users/empA"), { role: "admin" }));
  });

  it("BLOCKS a manager from deactivating an admin", async () => {
    await assertFails(updateDoc(doc(asMgr(), "users/admin"), { status: "inactive" }));
  });

  it("BLOCKS a manager from creating a user", async () => {
    await assertFails(setDoc(doc(asMgr(), "users/new"), { role: "employee", status: "active", name: "X" }));
  });

  it("lets a manager edit an employee profile", async () => {
    await assertSucceeds(updateDoc(doc(asMgr(), "users/empA"), { designation: "Senior" }));
  });

  it("lets an admin create a user", async () => {
    await assertSucceeds(setDoc(doc(asAdmin(), "users/new"), { role: "employee", status: "active", name: "X" }));
  });
});

describe("Tasks & notifications integrity", () => {
  it("lets an employee create a self-assigned task", async () => {
    await assertSucceeds(
      addDoc(collection(asEmpA(), "tasks"), { assignedTo: "empA", createdBy: "empA", name: "T", status: "Pending", dueDate: "2026-01-01" })
    );
  });

  it("BLOCKS an employee from assigning a task to another employee", async () => {
    await assertFails(
      addDoc(collection(asEmpA(), "tasks"), { assignedTo: "empB", createdBy: "empA", name: "T", status: "Pending", dueDate: "2026-01-01" })
    );
  });

  it("BLOCKS an employee from creating a notification addressed to someone else", async () => {
    await assertFails(
      addDoc(collection(asEmpA(), "notifications"), { userId: "empB", title: "spoof", read: false })
    );
  });

  it("lets an employee create their own notification", async () => {
    await assertSucceeds(
      addDoc(collection(asEmpA(), "notifications"), { userId: "empA", title: "mine", read: false })
    );
  });
});

describe("Audit log integrity", () => {
  it("BLOCKS creating an audit entry that claims a false role", async () => {
    await assertFails(
      addDoc(collection(asEmpA(), "auditLogs"), { userId: "empA", role: "admin", action: "hack", entity: "x", userName: "A" })
    );
  });

  it("lets an employee log their own genuine activity", async () => {
    await assertSucceeds(
      addDoc(collection(asEmpA(), "auditLogs"), { userId: "empA", role: "employee", action: "update", entity: "client", userName: "A" })
    );
  });

  it("BLOCKS editing or deleting an audit entry (immutable trail)", async () => {
    let id;
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const ref = await addDoc(collection(ctx.firestore(), "auditLogs"), { userId: "admin", role: "admin", action: "x", entity: "y", userName: "Admin" });
      id = ref.id;
    });
    await assertFails(updateDoc(doc(asAdmin(), `auditLogs/${id}`), { action: "tamper" }));
    await assertFails(deleteDoc(doc(asAdmin(), `auditLogs/${id}`)));
  });
});

describe("Sales & settings", () => {
  it("BLOCKS Employee A from reading Employee B's sale", async () => {
    await assertFails(getDoc(doc(asEmpA(), "sales/sB")));
  });

  it("BLOCKS an employee from writing global settings", async () => {
    await assertFails(setDoc(doc(asEmpA(), "settings/app"), { services: [] }));
  });

  it("lets an admin write global settings", async () => {
    await assertSucceeds(setDoc(doc(asAdmin(), "settings/app"), { services: [] }));
  });
});
