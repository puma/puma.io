---
---

$(function() {
  $('#overview').fitVids();

  $(window).resize(function(){
    // Redraw visualization on resize to recalcuate widths
    $('.visualize').remove();

    var dataTable = $('#memory-usage-comparision table');
    var visualizationWidth = dataTable.parent().width();
    var visualizationColors = [];

    // Grab colors from Speed Comparison chart (defined as SASS Variables)
    $('#speed-comparison ul li').each(function(){
      visualizationColors.push($(this).css('background-color'));
    });

    dataTable.visualize({
      width:visualizationWidth,
      type:'line',
      parseDirection:'y',
      colors: visualizationColors
    });

    dataTable.hide();

  }).resize();
});