"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { StudentWorkspace } from "@/components/workspace/StudentWorkspace";
import { getRegistration, getStudentLearningProfile } from "@/lib/auth-storage";
import { appRoutes } from "@/lib/routes";

export default function StudentChatPage() {
  const router = useRouter();
  const registration = getRegistration("student");
  const learningProfile = getStudentLearningProfile();

  useEffect(() => {
    if (!registration || registration.role !== "student") {
      router.replace(appRoutes.student);
      return;
    }

    if (!learningProfile) {
      router.replace(appRoutes.studentLearningProfile);
    }

  }, [learningProfile, registration, router]);

  if (!registration || registration.role !== "student" || !learningProfile) {
    return null;
  }

  return <StudentWorkspace />;
}
