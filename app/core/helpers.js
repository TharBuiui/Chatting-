var User = require('../models/user');

module.exports = {
    sanitizeQuery: function(query, options) {
        if (options.defaults.take && !query.take) {
            query.take = options.defaults.take;
        }
        if (options.maxTake < query.take) {
            query.take = options.maxTake;
        }

        if (typeof query.reverse === 'string') {
            query.reverse = query.reverse.toLowerCase() === 'true';
        }

        if (typeof query.reverse === 'undefined') {
            query.reverse = options.defaults.reverse;
        }

        return query;
    },

    sanitizeOwner: function(messages) {
        for (var i = 0; messages && (i < messages.length); i++) {
            if (!messages[i].owner) {
                messages[i].owner = new User({
                    displayName: 'Unknown',
                    username: '_unknown'
                });
            }
        }
    }
};
