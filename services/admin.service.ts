"use client";

import {
  doc,
  getDoc,
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  db,
} from "basebase-js";

export interface ProjectAdmin {
  role: "admin" | "super_admin";
  createdAt: string;
  addedBy: string;
}

export class AdminService {
  /**
   * Check if a user is an admin by looking up the project_admins collection
   */
  static async isUserAdmin(userId: string): Promise<boolean> {
    try {
      const adminDoc = doc(db, `newswithfriends/project_admins/${userId}`);
      const adminSnap = await getDoc(adminDoc);
      return adminSnap.exists;
    } catch (error) {
      console.error("[AdminService] Error checking admin status:", error);
      return false;
    }
  }

  /**
   * Get admin details for a specific user
   */
  static async getAdminDetails(userId: string): Promise<ProjectAdmin | null> {
    try {
      const adminDoc = doc(db, `newswithfriends/project_admins/${userId}`);
      const adminSnap = await getDoc(adminDoc);

      if (adminSnap.exists) {
        return adminSnap.data() as ProjectAdmin;
      }
      return null;
    } catch (error) {
      console.error("[AdminService] Error fetching admin details:", error);
      return null;
    }
  }

  /**
   * Get all project admins (admin-only operation)
   */
  static async getProjectAdmins(): Promise<
    Array<{ id: string } & ProjectAdmin>
  > {
    try {
      const adminsCollection = collection(db, `newswithfriends/project_admins`);
      const adminsQuery = query(adminsCollection);
      const adminsSnap = await getDocs(adminsQuery);

      return adminsSnap.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as { id: string } & ProjectAdmin
      );
    } catch (error) {
      console.error("[AdminService] Error fetching project admins:", error);
      return [];
    }
  }

  /**
   * Add a new project admin (admin-only operation)
   */
  static async addProjectAdmin(
    userId: string,
    addedBy: string,
    role: "admin" | "super_admin" = "admin"
  ): Promise<boolean> {
    try {
      const adminDoc = doc(db, `newswithfriends/project_admins/${userId}`);
      await setDoc(adminDoc, {
        role,
        createdAt: new Date().toISOString(),
        addedBy,
      });

      console.log("[AdminService] Successfully added admin:", userId);
      return true;
    } catch (error) {
      console.error("[AdminService] Error adding project admin:", error);
      return false;
    }
  }

  /**
   * Remove a project admin (admin-only operation)
   */
  static async removeProjectAdmin(userId: string): Promise<boolean> {
    try {
      const adminDoc = doc(db, `newswithfriends/project_admins/${userId}`);
      await deleteDoc(adminDoc);

      console.log("[AdminService] Successfully removed admin:", userId);
      return true;
    } catch (error) {
      console.error("[AdminService] Error removing project admin:", error);
      return false;
    }
  }

  /**
   * Update admin role (admin-only operation)
   */
  static async updateAdminRole(
    userId: string,
    newRole: "admin" | "super_admin",
    updatedBy: string
  ): Promise<boolean> {
    try {
      const adminDoc = doc(db, `newswithfriends/project_admins/${userId}`);
      const currentData = await getDoc(adminDoc);

      if (!currentData.exists) {
        console.error(
          "[AdminService] Cannot update admin role - user is not an admin:",
          userId
        );
        return false;
      }

      const existingData = currentData.data() as ProjectAdmin;
      await setDoc(adminDoc, {
        ...existingData,
        role: newRole,
        updatedAt: new Date().toISOString(),
        updatedBy,
      });

      console.log(
        "[AdminService] Successfully updated admin role:",
        userId,
        newRole
      );
      return true;
    } catch (error) {
      console.error("[AdminService] Error updating admin role:", error);
      return false;
    }
  }
}
