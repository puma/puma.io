$(function() {

  var rg= "http://rubygems.org/api/v1/versions/puma/latest.json?callback=?";
  $.getJSON(rg).done(function(data) { $('#version').text(data['version']); });

  $('#overview').fitVids();

  $(window).resize(function(){
    // Redraw visualization on resize to recalcuate widths
    $('.visualize').remove();

    var dataTable = $('#speed-comparison table');
    var visualizationWidth = dataTable.parent().width();
    var visualizationColors = [];

    // Grab colors from Speed Comparison chart (defined as SASS Variables)
    // $('#memory-usage-comparison ul li').each(function(){
      // visualizationColors.push($(this).css('background-color'));
    // });

    $('#speed-comparison table tbody tr').each(function(){
      visualizationColors.push($(this).css('background-color'));
    });

    $('#speed-comparison table').visualize({
      width: visualizationWidth,
      type: 'line',
      parseDirection: 'x',
      colors: visualizationColors,
      yLabelInterval: 100,
      topValue: 17000,
      bottomValue: 0
    });

    dataTable.hide();

  }).resize();
});
