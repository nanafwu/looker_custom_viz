/**
 * Welcome to the Looker Visualization Builder! Please refer to the following resources 
 * to help you write your visualization:
 *  - API Documentation - https://github.com/looker/custom_visualizations_v2/blob/master/docs/api_reference.md
 *  - Example Visualizations - https://github.com/looker/custom_visualizations_v2/tree/master/src/examples
 **/

function compare_conversion_probability(
  alpha_posterior_A, beta_posterior_A, alpha_posterior_B, beta_posterior_B) {
  var samples = 3000;
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

/*
Get dimensions or measures to use for variant, 
# visitors, and # conversions.
Set the 1st string dimension as the "variant".
Set the 2nd numeric dimension as the "# visitors".
Set the 3rd numeric dimension as the "conversions".
*/
function get_labels(queryResponse) {
  
    var lbl_variant, lbl_visitors, lbl_conversions;
    
    // First check dimensions
    for(var dim of queryResponse.fields.dimensions) {
      if (!lbl_variant && dim.type === "string") {
        lbl_variant = dim.name
      } else if (!lbl_visitors && dim.type == "number") {
        lbl_visitors = dim.name
      } else if (!lbl_conversions && dim.type == "number") {
        lbl_conversions = dim.name
      }
    }
    // Next check measures
    for(var msr of queryResponse.fields.measures) {
      if (!lbl_variant && msr.type === "string") {
        lbl_variant = msr.name
      } else if (!lbl_visitors && msr.type == "number") {
        lbl_visitors = msr.name
      } else if (!dim_conversions && msr.type == "number") {
        lbl_conversions = msr.name
      }
    }
    
    console.log('Variant:', lbl_variant,
               '\nVisitors:', lbl_visitors,
               '\nConversions', lbl_conversions)  
    return {
      variant: lbl_variant,
      visitors: lbl_visitors,
      conversions: lbl_conversions
    }
}


/*
Get the data to use for AB test calculations.
Only check first two rows of data
*/
function get_ab_test_data(data, label_variant, label_visitors, label_conversions) {

    var visitors_to_A = data[0][label_visitors].value; 
    var visitors_to_B = data[1][label_visitors].value; 
    
    var conversions_from_A = data[0][label_conversions].value; 
    var conversions_from_B = data[1][label_conversions].value; 
  
    var variant_A_label = data[0][label_variant].value; 
    var variant_B_label = data[1][label_variant].value;
  
    var conversion_rate_A = conversions_from_A / visitors_to_A;
    variant_A_label = variant_A_label.concat(' - ', conversion_rate_A.toFixed(3), ' conversion rate');
  
    var conversion_rate_B = conversions_from_B / visitors_to_B;
    variant_B_label = variant_B_label.concat(' - ', conversion_rate_B.toFixed(3), ' conversion rate');
    
    return {
      variant_A_label: variant_A_label,
      variant_B_label: variant_B_label,
      visitors_to_A: visitors_to_A,
      visitors_to_B: visitors_to_B,
      conversions_from_A: conversions_from_A,
      conversions_from_B: conversions_from_B
    }
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
    console.log('data: ', data),
    console.log('config: ', config)
    //console.log('details', details),
    console.log('queryResponse', queryResponse)

    var alpha_prior = 1;
    var beta_prior = 1;
    
    var labels = get_labels(queryResponse);
    var ab_test_data = get_ab_test_data(data, labels.variant, labels.visitors, labels.conversions)
    
    var alpha_posterior_A = alpha_prior + ab_test_data.conversions_from_A;
    var beta_posterior_A = beta_prior + ab_test_data.visitors_to_A - ab_test_data.conversions_from_A;
    
    var alpha_posterior_B = alpha_prior + ab_test_data.conversions_from_B;
    var beta_posterior_B = beta_prior + ab_test_data.visitors_to_B - ab_test_data.conversions_from_B;
    
    // Calculate which variant has a higher conversion rate
    compare_conversion_probability(alpha_posterior_A, beta_posterior_A, alpha_posterior_B, beta_posterior_B);
    
    // set the dimensions and margins of the graph
    var margin = {top: 0, right: 10, bottom: 30, left: 30},
        width = 900 - margin.left - margin.right,
        height = 250 - margin.top - margin.bottom;

    var graph_width = 400;
    var graph_height = 200;
    
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
        .range([0, graph_width]);
    
    svg.append("g")
        .attr("transform", "translate(0," + graph_height + ")")
        .call(d3.axisBottom(x));

    // add the y Axis
    var y = d3.scaleLinear()
              .range([graph_height, 0])
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
    svg.append("text").attr("x", 320).attr("y", 30).text(ab_test_data.variant_A_label).style("font-size", "15px").attr("alignment-baseline","middle")
    svg.append("text").attr("x", 320).attr("y", 60).text(ab_test_data.variant_B_label).style("font-size", "15px").attr("alignment-baseline","middle")

    doneRendering()
  }
});
