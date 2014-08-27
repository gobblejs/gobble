module.exports = function () {
	return process.env.GOBBLE_ENV || 'development';
};
