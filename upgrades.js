/** @namespace H5PUpgrades */
var H5PUpgrades = H5PUpgrades || {};

H5PUpgrades['H5P.Audio'] = (function ($) {
  return {
    1: {
      3: function (parameters, finished, extras) {
        if (parameters.files && parameters.files.length > 0) {
          var copyright = parameters.files[0].copyright;
          if (copyright) {
            // Try to find start and end year
            var years = copyright.year
              .replace(' ', '')
              .replace('--', '-') // Try to check for LaTeX notation
              .split('-');
            var yearFrom = new Date(years[0]).getFullYear();
            var yearTo = (years.length > 0) ? new Date(years[1]).getFullYear() : undefined;

            // Build metadata object
            var metadata = {
              title: copyright.title,
              authors: (copyright.author) ? [{name: copyright.author}] : undefined,
              source: copyright.source,
              yearFrom: isNaN(yearFrom) ? undefined : yearFrom,
              yearTo: isNaN(yearTo) ? undefined : yearTo,
              license: copyright.license,
              licenseVersion: copyright.version
            };

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
})(H5P.jQuery);
