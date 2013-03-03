require 'gh_contributors'

namespace :update do
  desc 'Update list of contributors'
  task :contributors do
    GhContributors.for_org('puma').to_urls.update_files('_includes/ey_header.html')
  end
end
