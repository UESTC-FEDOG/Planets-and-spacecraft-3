(function(_, $) {

    _.templateSettings = {
        interpolate: /\{\{(.+?)\}\}/g
    };

    var spacecrafts = [],
        commandCenter = new Mediator();

    function getSpacecraft() {
        if (spacecraftsCount >= 4) return;

        var spacecraft = spacecraftFactory({
            universe: $('#universe')[0],
            mediators: commandCenter,
            charging: true,
            speed: _.random(10, 30)
        });


        function renderSpacecraftandPanel(spacecraft) {
            var $divEle = spacecraft.$el = $('<div>'),
                $panelTemplate = $('#spacecraft-panel-template'),

                renderTemplate = _.template($panelTemplate.html());

            $divEle.addClass('spacecraft')
                .appendTo(spacecraft.universe)
                .animate();

            $('#universe-panel').before(renderTemplate({
                id: spacecraft.id
            }));
        }

        renderSpacecraftandPanel(spacecraft);
        spacecrafts.push(spacecraft);
    }

    function startSpacecraft() {
        var id = this.parentNode.dataset['for'],
            spacecraft = _.find(spacecrafts, function(spacecraft) {
                return spacecraft.id === id;
            });

        commandCenter.broadcast('command', {
            id: id,
            command: 'start'
        });
    }

    var $panel = $('#panel');
    $panel.on('click', '[data-type="new"]', getSpacecraft)
        .on('click', '[data-type="start"]', startSpacecraft)
        .on('click', '[data-type="stopt"]', stopSpacecaft)
        .on('click', '[data-type="destroy"]', destroySpacecraft);


} (_, $));