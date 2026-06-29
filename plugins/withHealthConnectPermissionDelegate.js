/**
 * Expo config plugin — registers the react-native-health-connect permission
 * delegate in MainActivity.onCreate.
 *
 * Why this exists:
 * react-native-health-connect (v2+) requires
 *   HealthConnectPermissionDelegate.setPermissionDelegate(this)
 * to run in MainActivity.onCreate. That call initializes the `lateinit`
 * ActivityResultLauncher used by requestPermission(). The library's bundled
 * config plugin only adds the permissions-rationale intent filter — it does
 * NOT register the delegate. Without it, calling requestPermission() in a
 * production build throws UninitializedPropertyAccessException natively and
 * crashes the app (uncatchable from JS).
 *
 * This plugin also adds the <queries> entry so the app can resolve the Health
 * Connect provider package (required for package visibility on Android 11+).
 */
const { withMainActivity, withAndroidManifest } = require('@expo/config-plugins');

const IMPORT_LINE =
  'import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate';
const DELEGATE_CALL = 'HealthConnectPermissionDelegate.setPermissionDelegate(this)';
const HC_PROVIDER_PACKAGE = 'com.google.android.apps.healthdata';

function addImport(contents) {
  if (contents.includes(IMPORT_LINE)) return contents;
  // Insert the import right after the package declaration line.
  return contents.replace(/^(package .+)$/m, `$1\n\n${IMPORT_LINE}`);
}

function addDelegateCall(contents) {
  if (contents.includes(DELEGATE_CALL)) return contents;
  // Insert the delegate registration immediately after super.onCreate(...).
  // registerForActivityResult must run before the activity is started, so
  // onCreate is the correct (and only safe) place.
  const superOnCreate = /(super\.onCreate\([^)]*\))/;
  if (!superOnCreate.test(contents)) {
    throw new Error(
      '[withHealthConnectPermissionDelegate] Could not find super.onCreate(...) in MainActivity. ' +
        'The Health Connect permission delegate was NOT registered — requestPermission() will crash.'
    );
  }
  return contents.replace(superOnCreate, `$1\n    ${DELEGATE_CALL}`);
}

const withHealthConnectPermissionDelegate = (config) => {
  // 1. Register the permission delegate inside MainActivity.onCreate.
  config = withMainActivity(config, (cfg) => {
    if (cfg.modResults.language !== 'kt') {
      throw new Error(
        '[withHealthConnectPermissionDelegate] Expected a Kotlin MainActivity (.kt). ' +
          `Got language="${cfg.modResults.language}".`
      );
    }
    let contents = cfg.modResults.contents;
    contents = addImport(contents);
    contents = addDelegateCall(contents);
    cfg.modResults.contents = contents;
    return cfg;
  });

  // 2. Add <queries> so the Health Connect provider package is visible, and the
  //    Android 14+ (API 34) privacy-policy activity-alias. Apps targeting API 34
  //    MUST declare an activity handling VIEW_PERMISSION_USAGE with the
  //    HEALTH_PERMISSIONS category, otherwise Health Connect won't list the app
  //    or grant it permissions. The library's bundled plugin only adds the older
  //    ACTION_SHOW_PERMISSIONS_RATIONALE filter (Android 13 and below).
  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    // 2a. <queries> for the Health Connect provider package.
    if (!Array.isArray(manifest.queries)) manifest.queries = [];
    const queryDeclared = manifest.queries.some((q) =>
      q.package?.some((p) => p?.$?.['android:name'] === HC_PROVIDER_PACKAGE)
    );
    if (!queryDeclared) {
      manifest.queries.push({
        package: [{ $: { 'android:name': HC_PROVIDER_PACKAGE } }],
      });
    }

    // 2b. Android 14+ permission-usage activity-alias.
    const application = manifest.application?.[0];
    if (application) {
      if (!Array.isArray(application['activity-alias'])) application['activity-alias'] = [];
      const aliasName = 'ViewPermissionUsageActivity';
      const aliasDeclared = application['activity-alias'].some(
        (a) => a?.$?.['android:name'] === aliasName
      );
      if (!aliasDeclared) {
        application['activity-alias'].push({
          $: {
            'android:name': aliasName,
            'android:exported': 'true',
            'android:targetActivity': '.MainActivity',
            'android:permission': 'android.permission.START_VIEW_PERMISSION_USAGE',
          },
          'intent-filter': [
            {
              action: [{ $: { 'android:name': 'android.intent.action.VIEW_PERMISSION_USAGE' } }],
              category: [{ $: { 'android:name': 'android.intent.category.HEALTH_PERMISSIONS' } }],
            },
          ],
        });
      }
    }

    return cfg;
  });

  return config;
};

module.exports = withHealthConnectPermissionDelegate;
