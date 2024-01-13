const common = require('@sergeyzwezdin/semantic-release-commits-config');

module.exports = {
    ...common,
    plugins: [
        ...common.plugins,
        '@semantic-release/npm',
        [
            '@semantic-release/git',
            {
                assets: ['package.json', 'package-lock.json'],
                message: 'Update package.json version to ${nextRelease.version}'
            }
        ],
        '@semantic-release/github',
        [
            'semantic-release-telegram-bot',
            {
                notifications: [
                    {
                        chatIds: process.env.TELEGRAM_BOT_CHAT_ID
                    }
                ]
            }
        ]
    ]
};
