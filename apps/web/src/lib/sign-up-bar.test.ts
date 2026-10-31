// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import { pushRecentJobRef } from './recently-viewed-jobs';
import {
  retireSignUpBar,
  signUpBarDue,
  signUpBarPlacement,
} from './sign-up-bar';

describe('signUpBarPlacement', () => {
  it('stays off the auth and apply pages', () => {
    for (const path of [
      '/sign-in',
      '/forgot-password',
      '/reset-password',
      '/accept-invite',
      '/verify-email',
      '/candidate/login',
      '/candidate/register',
      '/employer/register',
      '/moderator/login',
      '/jobs/senior-dev-abcd/apply',
    ]) {
      expect(signUpBarPlacement(path)).toBe('none');
    }
  });

  it('leaves a job page on a phone to its sticky apply bar', () => {
    expect(signUpBarPlacement('/jobs/senior-dev-abcd')).toBe('desktop');
  });

  it('shows everywhere else, landing pages included', () => {
    for (const path of [
      '/',
      '/jobs',
      '/jobs/city/beograd',
      '/jobs/category/it/city/novi-sad',
      '/companies/devlegion',
    ]) {
      expect(signUpBarPlacement(path)).toBe('all');
    }
  });
});

describe('signUpBarDue', () => {
  beforeEach(() => localStorage.clear());

  it('waits for the third distinct job page', () => {
    pushRecentJobRef('a');
    pushRecentJobRef('b');
    pushRecentJobRef('a');
    expect(signUpBarDue()).toBe(false);
    pushRecentJobRef('c');
    expect(signUpBarDue()).toBe(true);
  });

  it('never comes back once retired', () => {
    for (const ref of ['a', 'b', 'c', 'd']) pushRecentJobRef(ref);
    retireSignUpBar();
    expect(signUpBarDue()).toBe(false);
  });
});
