export type SidebarItem = {
  title: string;
  description: string;
  badge?: string;
};

export type SidebarSection = {
  title: string;
  items: SidebarItem[];
};
