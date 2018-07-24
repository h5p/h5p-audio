/** @namespace H5PUpgrades */
var H5PUpgrades = H5PUpgrades || {};

H5PUpgrades['H5P.Audio'] = (function () {
  return {
    1: {
      3: function (parameters, finished, extras) {
        if (parameters.files && parameters.files.length > 0) {
          var copyright = parameters.files[0].copyright;
          if (copyright) {
            var years = [];
            if (copyright.year) {
            // Try to find start and end year
            years = copyright.year
              .replace(' ', '')
              .replace('--', '-') // Try to check for LaTeX notation
              .split('-');
            }
            var yearFrom = (years.length > 0) ? new Date(years[0]).getFullYear() : undefined;
            var yearTo = (years.length > 0) ? new Date(years[1]).getFullYear() : undefined;

            // Build metadata object
            var metadata = {
              title: copyright.title,
              authors: (copyright.author) ? [{name: copyright.author, role: ''}] : undefined,
              source: copyright.source,
              yearFrom: isNaN(yearFrom) ? undefined : yearFrom,
              yearTo: isNaN(yearTo) ? undefined : yearTo,
              license: copyright.license,
              licenseVersion: copyright.version
            };

            extras = extras || {};
            extras.metadata = metadata;

            parameters.files.forEach(function (file) {
              delete file.copyright;
            });

          }
        }

        // Done
        finished(null, parameters, extras);
      }
    }
  };
})();
