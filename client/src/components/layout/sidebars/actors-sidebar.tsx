import { useLocation } from 'wouter';
import { Users, Crosshair } from 'lucide-react';
import { SidebarSection, SidebarItem } from '@/components/layout/sidebar-primitives';

export function ActorsSidebar() {
  const [location] = useLocation();
  const onDirectory = location === '/threat-actors';

  return (
    <SidebarSection label="Threat Actors" icon={Users}>
      <SidebarItem
        icon={Crosshair}
        label="Threat Groups"
        href="/threat-actors"
        active={onDirectory}
        testId="button-threat-actors"
      />
    </SidebarSection>
  );
}
