/**
 * Welcome to the Looker Visualization Builder! Please refer to the following resources 
 * to help you write your visualization:
 *  - API Documentation - https://github.com/looker/custom_visualizations_v2/blob/master/docs/api_reference.md
 *  - Example Visualizations - https://github.com/looker/custom_visualizations_v2/tree/master/src/examples
 **/

function compare_conversion_probability (
  alpha_posterior_A, beta_posterior_A, alpha_posterior_B, beta_posterior_B) {
  var samples = 5000;
  var A_greater_than_B = 0;
  var B_greater_than_A = 0;
    
  var comparison_calculations = _.map(_.range(samples), function(i){ 
    var sample_A = jStat.beta.sample(alpha_posterior_A, beta_posterior_A); 
    var sample_B = jStat.beta.sample(alpha_posterior_B, beta_posterior_B); 
    if (sample_A > sample_B) {
      A_greater_than_B += 1;
    } else {
      B_greater_than_A += 1;
    }  
  }); 
  
  var prob_A_greater_than_B = A_greater_than_B / samples;
  var prob_B_greater_than_A = B_greater_than_A / samples;
    
  console.log('A_greater_than_B', prob_A_greater_than_B,
             'B_greater_than_A', prob_B_greater_than_A)  
}

looker.plugins.visualizations.add({

 options: {
    first_option: {
      type: "string",
      label: "My First Option",
      default: "Default Value"
    },
    second_option: {
      type: "number",
      label: "My Second Option",
      default: 42
    }
  },
  
 /**
 /**
  * The create function gets called when the visualization is mounted but before any
  * data is passed to it.
  **/
  create: function(element, config){
    console.log('-- Creating something --')
    element.style.fontFamily = `"Open Sans", "Helvetica", sans-serif`
    //element.innerHTML = "";
  },

 /**
  * UpdateAsync is the function that gets called (potentially) multiple times. It receives
  * the data and should update the visualization with the new data.
  **/
  updateAsync: function(data, element, config, queryResponse, details, doneRendering){
    console.log('-- Update Async --')
    //console.log('data: ', data),
    console.log('config: ', config)
    //console.log('details', details),
    console.log('queryResponse', queryResponse)

    var alpha_prior = 1;
    var beta_prior = 1;
    var variant_A_label = 'Variant A'; 
    var variant_B_label = 'Variant B';

    var visitors_to_A = 1300;
    var visitors_to_B = 1275;
    
    var conversions_from_A = 120;
    var conversions_from_B = 125;
    
    // for(var dim of queryResponse.fields.dimensions) {
    //   if (!variant_A_label && dim.type === "string") {
        
    //   }  
    // }
   
    
    var alpha_posterior_A = alpha_prior + conversions_from_A;
    var beta_posterior_A = beta_prior + visitors_to_A - conversions_from_A;
    
    var alpha_posterior_B = alpha_prior + conversions_from_B;
    var beta_posterior_B = beta_prior + visitors_to_B - conversions_from_B;
    
    // Calculate which variant has a higher conversion rate
    compare_conversion_probability(alpha_posterior_A, beta_posterior_A, alpha_posterior_B, beta_posterior_B);
    
    // set the dimensions and margins of the graph
    var margin = {top: 10, right: 10, bottom: 30, left: 30},
        width = 460 - margin.left - margin.right,
        height = 300 - margin.top - margin.bottom;

    // Clear any existing SVGs
    d3.select(element).selectAll("*").remove();
    // append the svg object to the body of the page
    var svg = d3.select(element)
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform",
              "translate(" + margin.left + "," + margin.top + ")");
    
    var beta_A = []
    var beta_B = []
    var max_Y = 0;
    var max_X = 0;
    
    // Draw beta distributions
    for (i = 0; i <= 1; i += 0.01) {
        var pdf_beta_A = jStat.beta.pdf(i, alpha_posterior_A, beta_posterior_A);
        var pdf_beta_B = jStat.beta.pdf(i, alpha_posterior_B, beta_posterior_B);
        
        if (pdf_beta_B > max_Y || pdf_beta_A > max_Y) {
          max_Y = pdf_beta_B;  
        }
        
        if (pdf_beta_A > 0.001 && i > max_X) {
            max_X = i;
        }   
        if (pdf_beta_B > 0.001 && i > max_X) {
            max_X = i;
        }    
        beta_A.push([i, pdf_beta_A])
        beta_B.push([i, pdf_beta_B])
    }
    
    // add the x Axis
    var x = d3.scaleLinear()
        .domain([0, max_X + 0.05])
        .range([0, width]);
    
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));

    // add the y Axis
    var y = d3.scaleLinear()
              .range([height, 0])
              .domain([0, max_Y]);
    
    svg.append("g")
        .call(d3.axisLeft(y));
    
    // Plot the area
    svg.append("path")
        .attr("class", "mypath")
        .datum(beta_A)
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
        .datum(beta_B)
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

    // Handmade legend
    svg.append("circle").attr("cx",300).attr("cy",30).attr("r", 6).style("fill", "#69b3a2")
    svg.append("circle").attr("cx",300).attr("cy",60).attr("r", 6).style("fill", "#404080")
    svg.append("text").attr("x", 320).attr("y", 30).text(variant_A_label).style("font-size", "15px").attr("alignment-baseline","middle")
    svg.append("text").attr("x", 320).attr("y", 60).text(variant_B_label).style("font-size", "15px").attr("alignment-baseline","middle")

    doneRendering()
  }
});
