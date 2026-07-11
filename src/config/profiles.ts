import type { DemoConfig, ProfileName } from './schema.js';

export interface ProfileFinding {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ProfileResolution {
  storyV2: boolean;
  profile?: ProfileName;
  source?: 'explicit' | 'destination-default';
  errors: ProfileFinding[];
  warnings: ProfileFinding[];
}

export const DESTINATION_PROFILE_DEFAULTS: Record<string, Exclude<ProfileName, 'product-tour'>> = {
  'github-readme': 'readme-loop',
  'product-hunt': 'readme-loop',
  'x-post': 'social-film',
  linkedin: 'social-film',
};

const COMPATIBILITY: Record<ProfileName, Record<string, 'compatible' | 'warning' | 'error'>> = {
  'readme-loop': {
    'github-readme': 'compatible',
    'product-hunt': 'compatible',
    'x-post': 'warning',
    linkedin: 'warning',
  },
  'social-film': {
    'github-readme': 'error',
    'product-hunt': 'error',
    'x-post': 'compatible',
    linkedin: 'compatible',
  },
  'product-tour': {
    'github-readme': 'error',
    'product-hunt': 'error',
    'x-post': 'warning',
    linkedin: 'warning',
  },
};

function finding(code: string, message: string, details?: Record<string, unknown>): ProfileFinding {
  return details ? { code, message, details } : { code, message };
}

export function resolveProfile(config: DemoConfig, destinations: string[] = []): ProfileResolution {
  const story = config.brief?.story;
  const storyV2 = story?.version === 2;
  const errors: ProfileFinding[] = [];
  const warnings: ProfileFinding[] = [];

  if (story && !storyV2) {
    errors.push(
      finding(
        'story.version.missing',
        'brief.story is present but version: 2 is missing; add version: 2 to opt into story-v2 validation',
      ),
    );
  }
  if (config.profile && !storyV2) {
    errors.push(
      finding(
        'profile.storyVersionRequired',
        `profile: ${config.profile} requires brief.story.version: 2; legacy configs must omit profile`,
        { profile: config.profile },
      ),
    );
    return { storyV2, profile: config.profile, source: 'explicit', errors, warnings };
  }
  if (!storyV2) return { storyV2, errors, warnings };

  let profile = config.profile;
  let source: ProfileResolution['source'] = profile ? 'explicit' : undefined;
  if (!profile && destinations.length > 0) {
    const defaults = [...new Set(destinations.map((destination) => DESTINATION_PROFILE_DEFAULTS[destination]).filter(Boolean))];
    if (defaults.length > 1) {
      errors.push(
        finding(
          'profile.destination.ambiguous',
          `destinations ${destinations.join(', ')} imply incompatible profile defaults; set profile explicitly`,
          { destinations, defaults },
        ),
      );
    } else if (defaults.length === 1) {
      profile = defaults[0];
      source = 'destination-default';
    }
  }
  if (!profile) {
    errors.push(
      finding(
        'profile.required',
        'story-v2 configs need an explicit profile, or a compatible --for destination that supplies one',
      ),
    );
    return { storyV2, errors, warnings };
  }

  if (config.profile) {
    for (const destination of destinations) {
      const compatibility = COMPATIBILITY[profile][destination];
      if (compatibility === 'warning') {
        warnings.push(
          finding(
            'profile.destination.suboptimal',
            `profile ${profile} is usable but not the default for ${destination}; the explicit story will not be rewritten`,
            { profile, destination },
          ),
        );
      } else if (compatibility === 'error') {
        errors.push(
          finding(
            'profile.destination.incompatible',
            `profile ${profile} is incompatible with ${destination}; the explicit story will not be rewritten`,
            { profile, destination },
          ),
        );
      }
    }
  }

  return { storyV2, profile, source, errors, warnings };
}
