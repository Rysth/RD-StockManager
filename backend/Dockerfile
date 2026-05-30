FROM ruby:3.4.2-slim

# Install dependencies
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential \
    git \
    libpq-dev \
    libyaml-dev \
    pkg-config \
    libncurses-dev

# Set working directory
WORKDIR /rails

# Install Rails
RUN gem install rails -v 8.0.2

# Copy Gemfile and install gems
COPY Gemfile* ./
RUN bundle install

# Copy application code
COPY . .

# Start the server by default
CMD ["rails", "server", "-b", "0.0.0.0"]