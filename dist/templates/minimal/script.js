(function () {
	var bindMenuEvents = function () {
		var $c2js = document.querySelectorAll('[c2js]');

		for (var i = 0; i < $c2js.length; i++) {
			var c2js = $c2js[i],
				button = c2js.querySelector('[c2-custom=menu]'),
				media = c2js.querySelector('video, audio'),
				menu = c2js.querySelector('.mm-container').classList,
				toggleFn = function () {
					if (menu.contains('actived')) {
						menu.remove('actived');
						return;
					}
					menu.add('actived');
				};

			media.addEventListener('click', toggleFn, false);
			button.addEventListener('click', toggleFn, false);
		}
	}

	if (document.readyState !== 'loading') {
		bindMenuEvents();
	} else {
		document.addEventListener('DOMContentLoaded', bindMenuEvents);
	}
}) ();