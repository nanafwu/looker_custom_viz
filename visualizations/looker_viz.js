/**
 * Welcome to the Looker Visualization Builder! Please refer to the following resources 
 * to help you write your visualization:
 *  - API Documentation - https://github.com/looker/custom_visualizations_v2/blob/master/docs/api_reference.md
 *  - Example Visualizations - https://github.com/looker/custom_visualizations_v2/tree/master/src/examples
 **/

const visObject = {

 
 /**
  * The create function gets called when the visualization is mounted but before any
  * data is passed to it.
  **/
	create: function(element, config){
    console.log('doing something')
		element.innerHTML = "<h1>Ready to render!</h1>";
	},

 /**
  * UpdateAsync is the function that gets called (potentially) multiple times. It receives
  * the data and should update the visualization with the new data.
  **/
	updateAsync: function(data, element, config, queryResponse, details, doneRendering){
    
    // set the dimensions and margins of the graph
    var margin = {top: 30, right: 30, bottom: 30, left: 50},
        width = 460 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    var svg = d3.select("#my_dataviz")
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform",
              "translate(" + margin.left + "," + margin.top + ")");

    // get the data
    d3.csv("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/data_doubleHist.csv", function(data) {

      // add the x Axis
      var x = d3.scaleLinear()
          .domain([-10,15])
          .range([0, width]);
      svg.append("g")
          .attr("transform", "translate(0," + height + ")")
          .call(d3.axisBottom(x));

      // add the y Axis
      var y = d3.scaleLinear()
                .range([height, 0])
                .domain([0, 0.12]);
      svg.append("g")
          .call(d3.axisLeft(y));

      // Compute kernel density estimation
      var kde = kernelDensityEstimator(kernelEpanechnikov(7), x.ticks(60))
      var density1 =  kde( data
          .filter( function(d){return d.type === "variable 1"} )
          .map(function(d){  return d.value; }) )
      var density2 =  kde( data
          .filter( function(d){return d.type === "variable 2"} )
          .map(function(d){  return d.value; }) )

      // Plot the area
      svg.append("path")
          .attr("class", "mypath")
          .datum(density1)
          .attr("fill", "#69b3a2")
          .attr("opacity", ".6")
          .attr("stroke", "#000")
          .attr("stroke-width", 1)
          .attr("stroke-linejoin", "round")
          .attr("d",  d3.line()
            .curve(d3.curveBasis)
              .x(function(d) { return x(d[0]); })
              .y(function(d) { return y(d[1]); })
          );

      // Plot the area
      svg.append("path")
          .attr("class", "mypath")
          .datum(density2)
          .attr("fill", "#404080")
          .attr("opacity", ".6")
          .attr("stroke", "#000")
          .attr("stroke-width", 1)
          .attr("stroke-linejoin", "round")
          .attr("d",  d3.line()
            .curve(d3.curveBasis)
              .x(function(d) { return x(d[0]); })
              .y(function(d) { return y(d[1]); })
          );

    });

    // Handmade legend
    svg.append("circle").attr("cx",300).attr("cy",30).attr("r", 6).style("fill", "#69b3a2")
    svg.append("circle").attr("cx",300).attr("cy",60).attr("r", 6).style("fill", "#404080")
    svg.append("text").attr("x", 320).attr("y", 30).text("variable A").style("font-size", "15px").attr("alignment-baseline","middle")
    svg.append("text").attr("x", 320).attr("y", 60).text("variable B").style("font-size", "15px").attr("alignment-baseline","middle")

    // Function to compute density
    function kernelDensityEstimator(kernel, X) {
      return function(V) {
        return X.map(function(x) {
          return [x, d3.mean(V, function(v) { return kernel(x - v); })];
        });
      };
    }
    function kernelEpanechnikov(k) {
      return function(v) {
        return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
      };
    }

		doneRendering()
	}
};

looker.plugins.visualizations.add(visObject);