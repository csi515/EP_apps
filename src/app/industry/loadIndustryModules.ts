import { installIndustryPlugins } from '@/core/industry/pluginHost';
import './industryCapabilityMap';
import './capabilityNavigation';
import { INDUSTRY_MODULES } from './industryModules';

installIndustryPlugins(INDUSTRY_MODULES.map((m) => m.plugin));
