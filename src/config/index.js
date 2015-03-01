export default {
	env: process.env.GOBBLE_ENV || 'development',
	cwd: process.env.GOBBLE_CWD || process.cwd()
};
