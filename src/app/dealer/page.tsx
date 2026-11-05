import { Suspense } from "react";
import { DealerApp, DealerSkeleton } from "@/components/dealer/DealerApp";

export default function DealerPage() {
  return (
    <Suspense fallback={<DealerSkeleton />}>
      <DealerApp />
    </Suspense>
  );
}
