"use client";
import { TabsContent } from "@/components/ui/tabs";
import { GersangArchive } from './gersang-archive';

type Props = Record<string, never>;

export function GameArchivePage(_props: Props) {
return (<TabsContent value="archive" className="tab-panel">
          <GersangArchive />
        </TabsContent>);
}
