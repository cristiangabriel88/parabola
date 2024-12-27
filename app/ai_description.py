from transformers import GPT2LMHeadModel, GPT2Tokenizer

# Load the lightweight GPT-2 model
model_name = "distilgpt2"  # Use distilgpt2 for lightweight needs

#Basic model
tokenizer = GPT2Tokenizer.from_pretrained(model_name)
model = GPT2LMHeadModel.from_pretrained(model_name)

#Trained model
# model = GPT2LMHeadModel.from_pretrained("./fine_tuned_distilgpt2")
# tokenizer = GPT2Tokenizer.from_pretrained("./fine_tuned_distilgpt2")

def generate_local_description(sun_sign, rising_sign):
    """
    Generate a description for astrology details using a local GPT-2 model.
    Args:
        sun_sign (str): The user's sun sign.
        rising_sign (str): The user's rising sign.
    Returns:
        str: Generated description.
    """
    # Create a prompt for the model
    prompt = (
        f"Write a short astrological description for a person with Sun in {sun_sign} "
        f"and Rising Sign in {rising_sign}. Describe how these traits complement each other."
    )

    # Encode the input prompt
    inputs = tokenizer.encode(prompt, return_tensors="pt")

    # Generate text using the model
    outputs = model.generate(
        inputs,
        max_length=100,  # Maximum length of the response
        num_return_sequences=1,  # Return one response
        temperature=0.7,  # Creativity level
        top_p=0.9,  # Nucleus sampling
        do_sample=True,  # Enable sampling
    )

    # Decode the generated text
    description = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return description